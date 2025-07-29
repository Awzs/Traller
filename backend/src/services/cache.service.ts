import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QueryResult,
  QueryResultDocument,
} from '../entities/query-result.entity';
import {
  EntityRelationship,
  EntityRelationshipDocument,
} from '../entities/entity-relationship.entity';
import { EntityResponseDto } from '../dto/query.dto';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface ProcessingStep {
  step: string;
  data: any;
  timestamp: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly processingCache = new Map<string, ProcessingStep[]>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly PROCESSING_TTL = 10 * 60 * 1000; // 10 minutes for processing steps

  constructor(
    @InjectModel(QueryResult.name)
    private queryResultModel: Model<QueryResultDocument>,
    @InjectModel(EntityRelationship.name)
    private entityRelationshipModel: Model<EntityRelationshipDocument>,
  ) {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: string, queryType?: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const type = queryType || 'other';
    return `query:${type}:${Buffer.from(normalizedQuery).toString('base64')}`;
  }

  /**
   * Generate processing key for query
   */
  private generateProcessingKey(query: string): string {
    return `processing:${Buffer.from(query.toLowerCase().trim()).toString('base64')}`;
  }

  /**
   * Set cache entry
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.logger.debug(`Cache entry set: ${key}`);
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.logger.debug(`Cache entry expired and removed: ${key}`);
      return null;
    }

    this.logger.debug(`Cache hit: ${key}`);
    return entry.data as T;
  }

  /**
   * Check if query result exists in cache or database
   */
  async getCachedQueryResult(query: string, queryType?: string): Promise<any | null> {
    const cacheKey = this.generateCacheKey(query, queryType);
    
    // First check in-memory cache
    const cachedResult = this.get(cacheKey);
    if (cachedResult) {
      this.logger.log(`返回缓存的查询结果: ${query}`);
      return cachedResult;
    }

    // Then check database for recent results (within last hour)
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dbResult = await this.queryResultModel
        .findOne({
          originalQuery: query,
          queryType: queryType || 'other',
          createdAt: { $gte: oneHourAgo },
        })
        .sort({ createdAt: -1 })
        .exec();

      if (dbResult) {
        const entities = JSON.parse(dbResult.structuredData) as EntityResponseDto[];
        const result = {
          id: String(dbResult._id),
          originalQuery: dbResult.originalQuery,
          queryType: dbResult.queryType,
          entities,
          createdAt: dbResult.createdAt || new Date(),
        };

        // Cache the database result
        this.set(cacheKey, result);
        this.logger.log(`从数据库返回最近的查询结果: ${query}`);
        return result;
      }
    } catch (error) {
      this.logger.warn(`数据库查询缓存失败: ${(error as Error).message}`);
    }

    return null;
  }

  /**
   * Cache query result
   */
  cacheQueryResult(query: string, queryType: string, result: any): void {
    const cacheKey = this.generateCacheKey(query, queryType);
    this.set(cacheKey, result);
    this.logger.log(`缓存查询结果: ${query}`);
  }

  /**
   * Store processing step
   */
  storeProcessingStep(query: string, step: string, data: any): void {
    const processingKey = this.generateProcessingKey(query);
    const steps = this.processingCache.get(processingKey) || [];
    
    steps.push({
      step,
      data,
      timestamp: Date.now(),
    });

    this.processingCache.set(processingKey, steps);
    this.logger.debug(`存储处理步骤: ${query} - ${step}`);

    // Clean up old processing steps (keep only last 10 minutes)
    const cutoff = Date.now() - this.PROCESSING_TTL;
    const validSteps = steps.filter(s => s.timestamp > cutoff);
    if (validSteps.length !== steps.length) {
      this.processingCache.set(processingKey, validSteps);
    }
  }

  /**
   * Get processing steps for query
   */
  getProcessingSteps(query: string): ProcessingStep[] {
    const processingKey = this.generateProcessingKey(query);
    return this.processingCache.get(processingKey) || [];
  }

  /**
   * Clear processing steps for query
   */
  clearProcessingSteps(query: string): void {
    const processingKey = this.generateProcessingKey(query);
    this.processingCache.delete(processingKey);
    this.logger.debug(`清除处理步骤: ${query}`);
  }

  /**
   * Save intermediate result to database immediately
   */
  async saveIntermediateResult(
    query: string,
    queryType: string,
    step: string,
    data: any,
  ): Promise<void> {
    try {
      // Store in processing cache
      this.storeProcessingStep(query, step, data);

      // For critical steps, also save to database
      if (['search_complete', 'structure_complete'].includes(step)) {
        const tempResult = new this.queryResultModel({
          originalQuery: `${query}_temp_${step}`,
          queryType: `temp_${queryType}`,
          structuredData: JSON.stringify(data),
          perplexityResponse: step === 'search_complete' ? JSON.stringify(data) : '',
        });

        await tempResult.save();
        this.logger.log(`保存中间结果到数据库: ${query} - ${step}`);
      }
    } catch (error) {
      this.logger.warn(`保存中间结果失败: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean up main cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    // Clean up processing cache
    for (const [key, steps] of this.processingCache.entries()) {
      const validSteps = steps.filter(s => now - s.timestamp <= this.PROCESSING_TTL);
      if (validSteps.length === 0) {
        this.processingCache.delete(key);
        cleanedCount++;
      } else if (validSteps.length !== steps.length) {
        this.processingCache.set(key, validSteps);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`清理过期缓存条目: ${cleanedCount}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      cacheSize: this.cache.size,
      processingCacheSize: this.processingCache.size,
      timestamp: new Date(),
    };
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.processingCache.clear();
    this.logger.log('清空所有缓存');
  }
}
