import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { QueryResult } from '../src/entities/query-result.entity';
import { EntityRelationship } from '../src/entities/entity-relationship.entity';
import { getModelToken } from '@nestjs/mongoose';

class DataCleanupScript {
  private app: any;
  private queryResultModel: Model<QueryResult>;
  private entityRelationshipModel: Model<EntityRelationship>;

  async initialize() {
    this.app = await NestFactory.createApplicationContext(AppModule);
    this.queryResultModel = this.app.get(getModelToken(QueryResult.name));
    this.entityRelationshipModel = this.app.get(getModelToken(EntityRelationship.name));
  }

  async listAllQueries() {
    console.log('\n=== 查看所有查询记录 ===');
    
    try {
      const queries = await this.queryResultModel.find({}).sort({ createdAt: -1 });
      
      console.log(`\n找到 ${queries.length} 条查询记录:`);
      queries.forEach((query, index) => {
        console.log(`${index + 1}. ID: ${query._id}`);
        console.log(`   查询: "${query.originalQuery}"`);
        console.log(`   类型: ${query.queryType}`);
        console.log(`   创建时间: ${query.createdAt}`);
        console.log('');
      });
      
      return queries;
    } catch (error) {
      console.error('❌ 获取查询记录失败:', error.message);
      return [];
    }
  }

  async deleteTestQueries() {
    console.log('\n=== 删除测试查询数据 ===');
    
    try {
      // 定义要删除的测试查询关键词
      const testKeywords = [
        '张悦琪',
        'Jane',
        '王振帅',
        'wang',
        '测试',
        'temp_structure_complete',
        'temp_search_complete'
      ];

      console.log('正在查找包含以下关键词的查询记录:');
      testKeywords.forEach(keyword => console.log(`  - ${keyword}`));

      // 构建查询条件 - 查找包含任何测试关键词的记录
      const deleteCondition = {
        $or: testKeywords.map(keyword => ({
          originalQuery: { $regex: keyword, $options: 'i' }
        }))
      };

      // 先查看要删除的记录
      const toDelete = await this.queryResultModel.find(deleteCondition);
      
      if (toDelete.length === 0) {
        console.log('✅ 没有找到匹配的测试数据');
        return;
      }

      console.log(`\n找到 ${toDelete.length} 条匹配的记录:`);
      toDelete.forEach((query, index) => {
        console.log(`${index + 1}. "${query.originalQuery}" (${query.createdAt})`);
      });

      // 删除查询结果
      const deleteResult = await this.queryResultModel.deleteMany(deleteCondition);
      console.log(`\n✅ 已删除 ${deleteResult.deletedCount} 条查询记录`);

      // 删除相关的实体关系数据
      const entityDeleteResult = await this.entityRelationshipModel.deleteMany({});
      console.log(`✅ 已删除 ${entityDeleteResult.deletedCount} 条实体关系记录`);

    } catch (error) {
      console.error('❌ 删除测试数据失败:', error.message);
      console.error('详细信息:', error);
    }
  }

  async deleteAllData() {
    console.log('\n=== 删除所有数据 ===');
    
    try {
      const queryCount = await this.queryResultModel.countDocuments();
      const entityCount = await this.entityRelationshipModel.countDocuments();
      
      console.log(`当前数据统计:`);
      console.log(`  - 查询记录: ${queryCount} 条`);
      console.log(`  - 实体关系: ${entityCount} 条`);

      if (queryCount === 0 && entityCount === 0) {
        console.log('✅ 数据库已经是空的');
        return;
      }

      // 删除所有查询结果
      const queryDeleteResult = await this.queryResultModel.deleteMany({});
      console.log(`✅ 已删除 ${queryDeleteResult.deletedCount} 条查询记录`);

      // 删除所有实体关系
      const entityDeleteResult = await this.entityRelationshipModel.deleteMany({});
      console.log(`✅ 已删除 ${entityDeleteResult.deletedCount} 条实体关系记录`);

      console.log('\n🎉 所有数据已清空');

    } catch (error) {
      console.error('❌ 删除所有数据失败:', error.message);
      console.error('详细信息:', error);
    }
  }

  async getStats() {
    console.log('\n=== 数据库统计 ===');
    
    try {
      const queryCount = await this.queryResultModel.countDocuments();
      const entityCount = await this.entityRelationshipModel.countDocuments();
      
      console.log(`查询记录总数: ${queryCount}`);
      console.log(`实体关系总数: ${entityCount}`);

      if (queryCount > 0) {
        const latestQuery = await this.queryResultModel.findOne().sort({ createdAt: -1 });
        const oldestQuery = await this.queryResultModel.findOne().sort({ createdAt: 1 });
        
        console.log(`最新查询: "${latestQuery?.originalQuery}" (${latestQuery?.createdAt})`);
        console.log(`最早查询: "${oldestQuery?.originalQuery}" (${oldestQuery?.createdAt})`);
      }

    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
    }
  }

  async showHelp() {
    console.log('\n=== 数据清理工具 ===');
    console.log('用于管理 Traller 数据库中的查询数据');
    console.log('\n可用命令:');
    console.log('  pnpm run clean list      - 列出所有查询记录');
    console.log('  pnpm run clean test      - 删除测试数据');
    console.log('  pnpm run clean all       - 删除所有数据');
    console.log('  pnpm run clean stats     - 显示数据库统计');
    console.log('  pnpm run clean help      - 显示帮助信息');
    console.log('\n示例:');
    console.log('  pnpm run clean test      # 删除包含测试关键词的数据');
    console.log('  pnpm run clean all       # 清空整个数据库');
  }

  async close() {
    await this.app.close();
  }
}

async function main() {
  const script = new DataCleanupScript();
  await script.initialize();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        await script.listAllQueries();
        break;

      case 'test':
        await script.deleteTestQueries();
        break;

      case 'all':
        await script.deleteAllData();
        break;

      case 'stats':
        await script.getStats();
        break;

      case 'help':
      default:
        await script.showHelp();
        break;
    }
  } catch (error) {
    console.error('执行错误:', error.message);
    console.error('详细信息:', error);
  } finally {
    await script.close();
  }
}

if (require.main === module) {
  main();
}
