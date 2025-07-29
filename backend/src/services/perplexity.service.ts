import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    // 使用 OpenRouter API 密钥和 URL
    this.apiKey = this.configService.get<string>('KIMI_API_KEY') || '';
    this.apiUrl = this.configService.get<string>('KIMI_API_URL') || 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      this.logger.warn(
        '⚠️  未配置 OpenRouter API 密钥！请在.env文件中配置KIMI_API_KEY',
      );
    }
  }

  async searchInformation(query: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `Perplexity API attempt ${attempt}/${maxRetries} for query: ${query}`,
        );
        const prompt = `作为专业的信息研究分析师，请对"${query}"进行全方位深度调研，构建完整的关系生态图谱。请按以下框架进行系统性分析：

## 🎯 核心身份档案
1. **基础信息**：全名、别名、年龄、性别、国籍、籍贯、现居地
2. **职业身份**：现任职务、公司职位、行业角色、社会身份
3. **联系信息**：官方网站、社交媒体、公开邮箱、办公地址
4. **教育履历**：学历背景、毕业院校、专业领域、导师关系、同窗好友
5. **职业轨迹**：完整工作经历、职位变迁、跳槽原因、职业转折点

## 🌐 关系网络生态
### 家庭圈层
6. **直系亲属**：配偶、子女、父母的详细信息和背景
7. **扩展家庭**：兄弟姐妹、岳父母、亲戚中的重要人物
8. **家族企业**：家族生意、家庭投资、财产分配

### 商业圈层
9. **创业伙伴**：联合创始人、早期合伙人、股权关系
10. **投资关系**：天使投资人、VC机构、PE基金、被投企业
11. **董事网络**：担任董事的公司、共同董事、董事会关系
12. **商业联盟**：战略合作伙伴、供应商、客户、竞争对手

### 职场圈层
13. **核心团队**：直接下属、核心员工、左右手
14. **同级同事**：平级合作伙伴、跨部门协作者
15. **上级关系**：汇报对象、mentor、职业引路人
16. **行业人脉**：同行精英、行业协会、专业组织

### 社交圈层
17. **私人友谊**：密友、发小、兴趣伙伴、社交圈
18. **导师关系**：人生导师、职业导师、精神导师
19. **学生关系**：门生、徒弟、传承关系
20. **公益网络**：慈善合作、公益组织、社会责任

## 📈 成长发展轨迹
21. **创业历程**：创业动机、关键节点、融资历程、发展阶段
22. **重大决策**：战略转折、重要选择、决策背景、影响结果
23. **成功案例**：代表作品、里程碑事件、获得成就、社会认可
24. **挫折经历**：失败案例、危机处理、复盘反思、东山再起
25. **学习成长**：知识更新、技能提升、思维进化、格局扩展

## 🔍 深度背景调研
26. **媒体形象**：公开报道、采访内容、演讲观点、媒体评价
27. **争议事件**：负面新闻、法律纠纷、商业争议、公关危机
28. **价值观念**：人生哲学、商业理念、社会观点、文化立场
29. **生活方式**：兴趣爱好、生活习惯、消费偏好、休闲方式
30. **影响力评估**：行业地位、社会影响、话语权、领导力

## 💰 财富与资产
31. **财富状况**：个人净资产、财富排名、收入来源、资产配置
32. **投资组合**：股权投资、房产投资、金融投资、收藏投资
33. **公司价值**：企业估值、市值变化、股权结构、分红情况

## 🚀 创新与未来
34. **创新成果**：专利技术、产品创新、商业模式、管理创新
35. **领导风格**：管理哲学、团队文化、激励方式、决策风格
36. **战略规划**：未来愿景、发展战略、扩张计划、转型方向
37. **行业趋势**：对行业的判断、预测、布局、应对策略

## 📊 数据要求
- **时间维度**：提供具体时间、发展时间线、重要时间节点
- **数据支撑**：具体数字、统计数据、财务数据、业绩数据
- **来源标注**：每条信息都要标注具体来源和链接
- **关系量化**：用1-10分评估关系紧密程度，并说明评分依据
- **影响评估**：分析每个关系对主体的具体影响和价值

请确保信息的准确性、时效性和权威性，优先使用官方资料、权威媒体、上市公司公告等可靠来源。对于每个相关人物和机构，请详细分析其与查询对象的关系形成过程、互动历史、合作成果和未来可能的发展方向。`;

        const response: AxiosResponse<OpenRouterResponse> = await axios.post(
          this.apiUrl,
          {
            model: 'perplexity/sonar-pro',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 8000, // 大幅提高token数以支持更丰富的上下文
            temperature: 0.3, // 降低温度以获得更稳定的结果
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://traller.ai',
              'X-Title': 'Traller AI - Persona Intelligence Explorer',
            },
            timeout: 180000, // 增加到3分钟超时以处理更长的上下文
          },
        );

        if (response.data.choices && response.data.choices.length > 0) {
          this.logger.log(`✅ 联网搜索服务 successful on attempt ${attempt}`);
          return response.data.choices[0].message.content;
        }

        throw new Error('No response from 联网搜索服务');
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `❌ 联网搜索服务 attempt ${attempt} failed:`,
          (error as Error).message,
        );

        if (attempt === maxRetries) {
          this.logger.error(
            'All 联网搜索服务 attempts failed:',
            (error as Error).message,
          );
          break;
        }

        // 重试前等待
        const waitTime = attempt * 2000; // 2秒, 4秒, 6秒
        this.logger.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Throw an error with the last encountered error message if all attempts fail
    throw new Error(
      `联网搜索服务错误: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
