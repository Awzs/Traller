import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PerplexityService } from './perplexity.service';
import { GeminiService } from './gemini.service';
import { TavilyService } from './tavily.service';
import { CacheService } from './cache.service';
import {
  QueryRequestDto,
  QueryResponseDto,
  EntityResponseDto,
} from '../dto/query.dto';
import {
  QueryResult,
  QueryResultDocument,
} from '../entities/query-result.entity';
import {
  EntityRelationship,
  EntityRelationshipDocument,
} from '../entities/entity-relationship.entity';

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    @InjectModel(QueryResult.name)
    private queryResultModel: Model<QueryResultDocument>,
    @InjectModel(EntityRelationship.name)
    private entityRelationshipModel: Model<EntityRelationshipDocument>,
    private perplexityService: PerplexityService,
    private geminiService: GeminiService,
    private tavilyService: TavilyService,
    private cacheService: CacheService,
  ) {}

  async processQuery(queryRequest: QueryRequestDto): Promise<QueryResponseDto> {
    try {
      this.logger.log(`Processing query: ${queryRequest.query}`);

      // Step 0: Check cache first
      const cachedResult = await this.cacheService.getCachedQueryResult(
        queryRequest.query,
        queryRequest.queryType,
      );
      if (cachedResult) {
        return cachedResult;
      }

      // Step 1: Try primary search service first, fallback to secondary if it fails
      let searchResponse: string;
      try {
        this.logger.log('调用主要联网搜索服务...');
        searchResponse = await this.perplexityService.searchInformation(
          queryRequest.query,
        );
        this.logger.log('✅ 主要联网搜索服务调用成功');

        // Store search result immediately
        await this.cacheService.saveIntermediateResult(
          queryRequest.query,
          queryRequest.queryType || 'other',
          'search_complete',
          { searchResponse, source: 'primary' },
        );
      } catch (primaryError) {
        this.logger.warn('❌ 主要联网搜索服务失败，切换到备用搜索服务...');
        this.logger.warn('主要搜索服务错误:', (primaryError as Error).message);

        try {
          searchResponse = await this.tavilyService.searchInformation(
            queryRequest.query,
          );
          this.logger.log('✅ 备用联网搜索服务调用成功');

          // Store fallback search result immediately
          await this.cacheService.saveIntermediateResult(
            queryRequest.query,
            queryRequest.queryType || 'other',
            'search_complete',
            { searchResponse, source: 'fallback' },
          );
        } catch (secondaryError) {
          this.logger.error('❌ 所有联网搜索服务均失败');
          throw new Error(`联网搜索服务失败: 主要服务: ${(primaryError as Error).message}, 备用服务: ${(secondaryError as Error).message}`);
        }
      }

      // Step 2: Use AI model for data structuring
      this.logger.log('调用大模型整合服务进行数据结构化...');
      const structuredEntities = await this.geminiService.structureData(
        searchResponse,
        queryRequest.query,
      );

      // Store structured data immediately
      await this.cacheService.saveIntermediateResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        'structure_complete',
        structuredEntities,
      );

      // Step 3: Enhance missing avatars using search service
      this.logger.log('使用联网搜索服务补充头像信息...');
      const enhancedEntities =
        await this.enhanceEntitiesWithAvatars(structuredEntities);

      // Step 4: Save to database and return structured response
      const savedQueryResult = await this.saveQueryResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        enhancedEntities,
        searchResponse,
      );

      const finalResult = {
        id: String(savedQueryResult._id),
        originalQuery: savedQueryResult.originalQuery,
        queryType: savedQueryResult.queryType,
        entities: enhancedEntities,
        createdAt: savedQueryResult.createdAt || new Date(),
      };

      // Cache the final result
      this.cacheService.cacheQueryResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        finalResult,
      );

      // Clear processing steps
      this.cacheService.clearProcessingSteps(queryRequest.query);

      return finalResult;
    } catch (error) {
      this.logger.error('Error processing query:', (error as Error).message);
      throw new Error(`Query processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process query with streaming updates
   */
  async processQueryWithStreaming(
    queryRequest: QueryRequestDto,
    sendUpdate: (step: string, data?: any) => void,
  ): Promise<QueryResponseDto> {
    try {
      this.logger.log(`Processing streaming query: ${queryRequest.query}`);

      // Step 1: Search with streaming updates
      sendUpdate('search_progress', '正在搜索信息...');
      let searchResponse: string;

      try {
        searchResponse = await this.perplexityService.searchInformation(
          queryRequest.query,
        );
        sendUpdate('search_complete', { source: 'primary', preview: searchResponse.substring(0, 200) + '...' });

        // Store search result immediately
        await this.cacheService.saveIntermediateResult(
          queryRequest.query,
          queryRequest.queryType || 'other',
          'search_complete',
          { searchResponse, source: 'primary' },
        );
      } catch (primaryError) {
        sendUpdate('search_fallback', '主要搜索服务失败，切换到备用服务...');

        try {
          searchResponse = await this.tavilyService.searchInformation(
            queryRequest.query,
          );
          sendUpdate('search_complete', { source: 'fallback', preview: searchResponse.substring(0, 200) + '...' });

          // Store fallback search result immediately
          await this.cacheService.saveIntermediateResult(
            queryRequest.query,
            queryRequest.queryType || 'other',
            'search_complete',
            { searchResponse, source: 'fallback' },
          );
        } catch (secondaryError) {
          sendUpdate('search_error', '所有搜索服务均失败');
          throw new Error(`联网搜索服务失败: 主要服务: ${(primaryError as Error).message}, 备用服务: ${(secondaryError as Error).message}`);
        }
      }

      // Step 2: Structure data with streaming updates
      sendUpdate('structure_progress', '正在结构化数据...');
      const structuredEntities = await this.geminiService.structureData(
        searchResponse,
        queryRequest.query,
      );
      sendUpdate('structure_complete', { entityCount: structuredEntities.length });

      // Store structured data immediately
      await this.cacheService.saveIntermediateResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        'structure_complete',
        structuredEntities,
      );

      // Step 3: Enhance avatars with streaming updates
      sendUpdate('avatar_progress', '正在补充头像信息...');
      const enhancedEntities = await this.enhanceEntitiesWithAvatarsStreaming(
        structuredEntities,
        sendUpdate,
      );
      sendUpdate('avatar_complete', { enhancedCount: enhancedEntities.length });

      // Step 4: Save final result
      sendUpdate('save_progress', '正在保存结果...');
      const savedQueryResult = await this.saveQueryResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        enhancedEntities,
        searchResponse,
      );

      const finalResult = {
        id: String(savedQueryResult._id),
        originalQuery: savedQueryResult.originalQuery,
        queryType: savedQueryResult.queryType,
        entities: enhancedEntities,
        createdAt: savedQueryResult.createdAt || new Date(),
      };

      // Cache the final result
      this.cacheService.cacheQueryResult(
        queryRequest.query,
        queryRequest.queryType || 'other',
        finalResult,
      );

      // Clear processing steps
      this.cacheService.clearProcessingSteps(queryRequest.query);

      sendUpdate('complete', finalResult);
      return finalResult;
    } catch (error) {
      this.logger.error('Error processing streaming query:', (error as Error).message);
      sendUpdate('error', { message: (error as Error).message });
      throw new Error(`Query processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get cached query result (exposed for controller)
   */
  async getCachedQueryResult(query: string, queryType?: string): Promise<any | null> {
    return await this.cacheService.getCachedQueryResult(query, queryType);
  }

  /**
   * Enhance entities with avatars using search service for all entities
   */
  private async enhanceEntitiesWithAvatars(
    entities: EntityResponseDto[],
  ): Promise<EntityResponseDto[]> {
    const enhancedEntities = [...entities];

    for (let i = 0; i < enhancedEntities.length; i++) {
      const entity = enhancedEntities[i];

      try {
        this.logger.log(
          `Searching avatar for entity: ${entity.name} (${entity.tag})`,
        );

        // Always search for avatar using search service
        const avatarUrl = await this.tavilyService.searchAvatar(
          entity.name,
          entity.tag,
        );

        enhancedEntities[i] = {
          ...entity,
          avatar_url: avatarUrl || '', // Use empty string if no avatar found
        };

        if (avatarUrl) {
          this.logger.log(`Found avatar for ${entity.name}: ${avatarUrl}`);
        } else {
          this.logger.log(`No avatar found for ${entity.name}`);
        }
      } catch (error) {
        this.logger.error(
          `Error enhancing avatar for ${entity.name}:`,
          (error as Error).message,
        );
        // Set empty avatar_url if search fails
        enhancedEntities[i] = {
          ...entity,
          avatar_url: '',
        };
      }
    }

    return enhancedEntities;
  }

  /**
   * Enhance entities with avatars using search service with streaming updates
   */
  private async enhanceEntitiesWithAvatarsStreaming(
    entities: EntityResponseDto[],
    sendUpdate: (step: string, data?: any) => void,
  ): Promise<EntityResponseDto[]> {
    const enhancedEntities = [...entities];

    for (let i = 0; i < enhancedEntities.length; i++) {
      const entity = enhancedEntities[i];

      try {
        sendUpdate('avatar_entity_progress', {
          current: i + 1,
          total: entities.length,
          entityName: entity.name,
        });

        this.logger.log(
          `Searching avatar for entity: ${entity.name} (${entity.tag})`,
        );

        // Always search for avatar using search service
        const avatarUrl = await this.tavilyService.searchAvatar(
          entity.name,
          entity.tag,
        );

        enhancedEntities[i] = {
          ...entity,
          avatar_url: avatarUrl || '', // Use empty string if no avatar found
        };

        if (avatarUrl) {
          this.logger.log(`Found avatar for ${entity.name}: ${avatarUrl}`);
          sendUpdate('avatar_found', {
            entityName: entity.name,
            avatarUrl,
          });
        } else {
          this.logger.log(`No avatar found for ${entity.name}`);
        }
      } catch (error) {
        this.logger.warn(
          `Error searching avatar for ${entity.name}:`,
          (error as Error).message,
        );
        // Keep entity without avatar on error
        enhancedEntities[i] = {
          ...entity,
          avatar_url: '',
        };
      }
    }

    return enhancedEntities;
  }

  /**
   * Save query result to database
   */
  private async saveQueryResult(
    originalQuery: string,
    queryType: string,
    entities: EntityResponseDto[],
    searchResponse: string,
  ): Promise<QueryResultDocument> {
    try {
      // Create and save query result
      const queryResult = new this.queryResultModel({
        originalQuery,
        queryType,
        structuredData: JSON.stringify(entities),
        perplexityResponse: searchResponse, // Keep the field name for database compatibility
      });

      const savedQueryResult = await queryResult.save();
      this.logger.log(
        `Saved query result with ID: ${String(savedQueryResult._id)}`,
      );

      // Save entity relationships
      const entityRelationships = entities.map((entity) => ({
        queryResultId: savedQueryResult._id,
        entityId: entity.id,
        name: entity.name,
        tag: entity.tag,
        avatarUrl: entity.avatar_url || '',
        relationshipScore: entity.relationship_score,
        summary: entity.summary,
        description: entity.description,
        links: JSON.stringify(entity.links),
      }));

      await this.entityRelationshipModel.insertMany(entityRelationships);
      this.logger.log(
        `Saved ${entityRelationships.length} entity relationships`,
      );

      return savedQueryResult;
    } catch (error) {
      this.logger.error('Error saving query result:', (error as Error).message);
      throw new Error(
        `Failed to save query result: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get search history with pagination
   */
  async getSearchHistory(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [results, total] = await Promise.all([
        this.queryResultModel
          .find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.queryResultModel.countDocuments().exec(),
      ]);

      return {
        results: results.map((result) => {
          const structuredData = JSON.parse(
            result.structuredData,
          ) as EntityResponseDto[];
          return {
            id: String(result._id),
            originalQuery: result.originalQuery,
            queryType: result.queryType,
            createdAt: result.createdAt || new Date(),
            entityCount: structuredData.length,
          };
        }),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error fetching search history:',
        (error as Error).message,
      );
      throw new Error(
        `Failed to fetch search history: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Get detailed query result by ID
   */
  async getQueryResultById(id: string): Promise<QueryResponseDto> {
    try {
      const queryResult = await this.queryResultModel.findById(id).exec();

      if (!queryResult) {
        throw new Error('Query result not found');
      }

      const entities = JSON.parse(
        queryResult.structuredData,
      ) as EntityResponseDto[];

      return {
        id: String(queryResult._id),
        originalQuery: queryResult.originalQuery,
        queryType: queryResult.queryType,
        entities,
        createdAt: queryResult.createdAt || new Date(),
      };
    } catch (error) {
      this.logger.error(
        'Error fetching query result by ID:',
        (error as Error).message,
      );
      throw new Error(
        `Failed to fetch query result: ${(error as Error).message}`,
      );
    }
  }
}
