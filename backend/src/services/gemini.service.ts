import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EntityResponseDto } from '../dto/query.dto';
import { JsonRepairService } from './json-repair.service';

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private configService: ConfigService,
    private jsonRepairService: JsonRepairService,
  ) {
    // 优先使用环境变量，否则使用硬编码密钥
    this.apiKey = this.configService.get<string>('KIMI_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('KIMI_API_URL') || '';
  }

  async structureData(
    perplexityResponse: string,
    originalQuery: string,
  ): Promise<EntityResponseDto[]> {
    try {
      const prompt = `作为专业的关系网络分析师和数据结构化专家，请基于以下搜索结果，构建"${originalQuery}"的完整关系生态图谱。

## 📊 原始数据源
${perplexityResponse}

## 🎯 核心任务要求

### 1. 主体识别与定位
- 将"${originalQuery}"设定为id=0的核心主体（主角）
- 深度分析主体的多重身份、核心价值和社会定位
- 构建主体的完整画像和发展轨迹

### 2. 关系网络构建
请识别并分析**12-15个最重要的相关实体**（人物/公司），构建多层次关系网络：

#### 🔥 核心圈层（9-10分）
- **家庭成员**：配偶、子女、父母、兄弟姐妹
- **创业伙伴**：联合创始人、早期合伙人、核心股东
- **直接业务关系**：现任公司、直接投资关系、控股企业

#### ⭐ 重要圈层（7-8分）
- **关键投资人**：天使投资人、VC机构、重要股东
- **核心团队**：CTO、CFO、核心高管、左右手
- **战略伙伴**：重要客户、供应商、合作伙伴
- **行业导师**：职业导师、精神导师、引路人

#### 🌟 影响圈层（5-6分）
- **同行精英**：行业竞争对手、同级企业家
- **专业网络**：行业协会、专业组织、咨询顾问
- **媒体关系**：重要媒体人、意见领袖、公关伙伴

#### 📡 外围圈层（3-4分）
- **社交网络**：朋友、校友、社交伙伴
- **公益关系**：慈善组织、公益伙伴、社会责任
- **文化关系**：文化界朋友、艺术收藏、兴趣圈

### 3. 关系紧密度评分标准
**10分**：血缘关系、配偶关系、联合创始人
**9分**：核心家庭成员、创业核心团队、控股关系
**8分**：重要投资人、核心高管、战略合作伙伴
**7分**：重要员工、董事会成员、长期合作伙伴
**6分**：行业合作伙伴、重要客户、供应商
**5分**：同行竞争对手、行业协会、专业组织
**4分**：媒体关系、公开合作、项目合作
**3分**：社交朋友、校友关系、兴趣伙伴
**2分**：偶然合作、间接关系、媒体提及
**1分**：远程关联、概念关联、传闻关系

### 4. 深度信息挖掘与补充
对每个实体进行全方位分析，**主动补充和推理**以下信息：

#### 📋 基础档案
- **身份信息**：全名、年龄、性别、国籍、现任职务
- **教育背景**：学历、毕业院校、专业、导师关系
- **职业履历**：工作经历、职位变迁、职业转折点
- **家庭状况**：婚姻状态、子女情况、家庭背景

#### 🏢 商业版图
- **企业关系**：创办企业、投资企业、董事职务
- **财务状况**：个人财富、企业估值、投资组合
- **商业成就**：代表作品、里程碑事件、获得荣誉
- **行业地位**：市场份额、竞争优势、影响力排名

#### 🤝 关系动态
- **关系起源**：如何认识、合作背景、关系发展
- **互动历史**：重要合作、共同项目、互动频率
- **关系价值**：对双方的价值、互补优势、协同效应
- **未来趋势**：关系发展方向、潜在合作、风险因素

#### 📰 公开信息
- **媒体报道**：重要新闻、采访内容、公开言论
- **社会活动**：公益活动、社会责任、文化参与
- **争议事件**：负面新闻、法律纠纷、危机处理
- **未来规划**：战略方向、发展计划、投资意向

### 5. 内容创作要求

#### Summary（摘要）
- **字数限制**：严格控制在35字以内
- **内容要求**：突出最核心的身份标签和与主体的关系
- **格式示例**：
  - "阿里巴巴联合创始人，马云创业伙伴，现任集团执行副主席"
  - "软银集团创始人，阿里巴巴重要投资人，日本首富"

#### Description（详细描述）
- **字数要求**：800-1200字，内容丰富详实
- **结构组织**：使用清晰的Markdown层级结构
- **内容框架**：按以下结构组织内容
  - ## 🎯 核心身份（基本信息、职业地位）
  - ## 🤝 与主体的关系（关系起源、合作历程、关系价值）
  - ## 💼 商业成就（创业历程、投资版图、行业影响）
  - ## 📈 发展轨迹（重要节点、成功案例、未来规划）
  - ## 🌐 社会影响（行业地位、社会责任、文化影响）

- **引用标记**：严格使用[1], [2], [3]等标记，与links数组对应
- **格式要求**：
  - 使用**粗体**强调关键信息
  - 使用*斜体*标注专业术语
  - 使用> 引用块展示重要声明
  - 使用- 列表展示成就和事件
  - 使用数字和具体数据支撑描述

#### Links（链接来源）
- **来源权威性**：优先使用官方网站、权威媒体、上市公司公告
- **链接有效性**：确保所有链接真实有效，可以访问
- **来源多样性**：包含不同类型的信息源
- **索引对应**：index必须与description中的引用标记一一对应

### 6. 智能补充与推理
当搜索结果信息不足时，请基于已知信息进行**合理推理和补充**：
- **行业常识**：基于行业特点补充可能的关系和信息
- **时间推理**：根据时间线推断可能的发展轨迹
- **关系推理**：基于已知关系推断其他可能的关系
- **价值推理**：基于商业逻辑推断关系的价值和意义

### 7. 质量控制标准
- **信息准确性**：确保所有信息真实可靠
- **逻辑一致性**：确保信息之间逻辑自洽
- **时效性**：优先使用最新信息
- **完整性**：确保信息覆盖全面
- **可读性**：确保内容结构清晰，易于理解

## 📤 输出格式要求

### JSON结构标准
返回格式必须是有效的JSON数组，包含12-15个实体，格式如下：

主体实体（id=0）示例：
{
  "id": 0,
  "name": "主体名称",
  "tag": "person"或"company",
  "relationship_score": 10,
  "summary": "核心身份标签，不超过35字",
  "description": "详细描述，800-1200字，Markdown格式，包含引用标记[1], [2], [3]等",
  "links": [
    {"index": 1, "url": "https://权威来源链接"},
    {"index": 2, "url": "https://官方资料链接"}
  ]
}

相关实体示例：
{
  "id": 1,
  "name": "相关实体名称",
  "tag": "person"或"company",
  "relationship_score": 8,
  "summary": "与主体关系的核心描述",
  "description": "详细分析内容...",
  "links": [相关链接数组]
}

### 严格执行规则
1. **JSON格式**：直接返回有效的JSON数组，不要包含任何额外的文字、解释或代码块标记
2. **字符编码**：所有字符串必须用双引号包围，正确转义特殊字符
3. **括号匹配**：确保所有括号和大括号正确闭合
4. **内容长度**：每个description控制在800-1200字，确保JSON完整性
5. **引用对应**：description中的[1], [2], [3]必须与links数组中的index严格对应
6. **链接有效**：所有URL必须是真实有效的链接
7. **实体数量**：返回12-15个最重要的相关实体
8. **评分准确**：relationship_score必须基于上述标准准确评分
9. **标签规范**：tag只能是"person"或"company"
10. **内容质量**：确保每个实体的信息丰富、准确、有价值

### 优先级排序
按以下优先级排列实体：
1. 主体本身（id=0）
2. 家庭核心成员（配偶、子女）
3. 创业核心伙伴（联合创始人）
4. 重要投资关系（投资人、被投企业）
5. 核心业务关系（现任公司、控股企业）
6. 关键人脉网络（导师、核心团队）
7. 行业重要关系（竞争对手、合作伙伴）
8. 社会影响关系（媒体、公益、文化）

请严格按照以上要求，基于搜索结果进行深度分析和智能补充，构建完整的关系生态图谱。`;

      const payload = {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              '你是一个专业的数据结构化专家，专门将非结构化的人物信息转换为标准化的JSON格式。你必须严格按照指定的JSON格式返回数据，直接返回完整且有效的JSON数组。重要：确保JSON格式完全正确，所有字符串用双引号，所有括号正确闭合，不要包含任何额外的文字、解释或代码块标记。如果内容可能超长，请优先保证JSON完整性。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 10000, 
      };

      const response = await axios.post<OpenRouterResponse>(
        this.apiUrl,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://traller.ai',
            'X-Title': 'Traller AI - Persona Intelligence Explorer',
          },
          timeout: 180000,
        },
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('大模型整合服务无响应内容');
      }

      const structuredData =
        this.jsonRepairService.parse<EntityResponseDto[]>(content);

      // 验证数据格式
      if (!Array.isArray(structuredData)) {
        throw new Error('大模型整合服务返回数据格式错误');
      }

      // 验证每个实体的必需字段
      for (const entity of structuredData) {
        if (!entity.id && entity.id !== 0) {
          throw new Error(`实体缺少ID字段: ${JSON.stringify(entity)}`);
        }
        if (!entity.name) {
          throw new Error(`实体缺少名称字段: ${JSON.stringify(entity)}`);
        }

        // Normalize tag values - convert 'organization' to 'company'
        if ((entity as any).tag === 'organization') {
          (entity as any).tag = 'company';
        }

        if (!entity.tag || !['person', 'company'].includes(entity.tag)) {
          throw new Error(`实体标签无效: ${entity.tag}`);
        }
        if (!entity.summary) {
          throw new Error(`实体缺少摘要字段: ${JSON.stringify(entity)}`);
        }
        if (!entity.description) {
          throw new Error(
            `实体缺少描述字段: ${JSON.stringify(entity)}`,
          );
        }
        if (!Array.isArray(entity.links)) {
          throw new Error(
            `实体链接字段格式错误: ${JSON.stringify(entity)}`,
          );
        }
      }

      this.logger.log(
        `✅ Successfully structured ${structuredData.length} entities`,
      );
      return structuredData;
    } catch (error) {
      this.logger.error('大模型整合服务调用错误:', error.message);
      throw new Error(`大模型整合服务错误: ${error.message}`);
    }
  }
}
