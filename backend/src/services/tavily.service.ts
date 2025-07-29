import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
}

interface TavilyResponse {
  answer: string;
  query: string;
  response_time: number;
  images: string[];
  results: TavilySearchResult[];
  search_depth: string;
  follow_up_questions?: string[];
}

@Injectable()
export class TavilyService {
  private readonly logger = new Logger(TavilyService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    // 优先使用环境变量，否则使用硬编码密钥
    this.apiKey =
      this.configService.get<string>('TAVILY_API_KEY') ||
      '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';
    this.apiUrl =
      this.configService.get<string>('TAVILY_API_URL') ||
      'https://api.tavily.com';

    if (
      !this.apiKey ||
      this.apiKey === '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'
    ) {
      this.logger.warn(
        '⚠️  使用默认Tavily API密钥，可能无效！请在.env文件中配置TAVILY_API_KEY',
      );
    }
  }

  /**
   * Search for comprehensive information about a query
   * @param query - Search query
   * @returns Promise<string> - Formatted search results
   */
  async searchInformation(query: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('联网搜索服务密钥未配置');
      }

      this.logger.log(`Searching comprehensive information for: ${query}`);

      // 构建更详细的搜索查询
      const detailedQuery = `请搜索关于"${query}"的全面深度信息，构建完整的人物/公司关系网络。请包括：

## 核心信息
1. **基本信息**：姓名、年龄、性别、国籍、现任职务、公司职位
2. **联系方式**：官方网站、社交媒体账号、联系邮箱（如果公开）
3. **教育背景**：毕业院校、专业、学位、重要导师或同学关系
4. **工作经历**：完整的职业发展轨迹，包括时间、职位、公司

## 关系网络分析
5. **家庭关系**：配偶、子女、父母、兄弟姐妹等重要家庭成员
6. **商业伙伴**：共同创业者、投资人、被投公司、董事会成员
7. **同事关系**：现任和前任重要同事、下属、上级
8. **行业关系**：同行业的竞争对手、合作伙伴、客户、供应商
9. **社交关系**：朋友、导师、学生、社区关系、公益合作

## 深度背景
10. **重要事件**：创业历程、重大决策、失败经历、成功案例
11. **媒体报道**：近期新闻、采访内容、公开演讲、观点态度
12. **争议事件**：法律纠纷、商业争议、社会争议（如有）
13. **影响力评估**：行业地位、社会影响、获奖记录、认证资质
14. **财务状况**：公司估值、个人财富、投资组合（公开信息）

## 特别关注
15. **创新成果**：专利、产品、技术、商业模式创新
16. **领导风格**：管理理念、企业文化、团队建设方式
17. **未来规划**：公开的战略规划、扩张计划、投资方向

要求信息尽可能详细、准确、最新，包含丰富的上下文背景和深度分析。`;

      // 执行多轮搜索以获取更全面的信息
      const searchPromises = [
        // 主要搜索
        this.performSingleSearch(detailedQuery, 'advanced', 15),
        // 关系网络搜索
        this.performSingleSearch(`${query} 关系网络 合作伙伴 投资人 家庭成员`, 'advanced', 10),
        // 最新动态搜索
        this.performSingleSearch(`${query} 最新消息 近期动态 2024 2025`, 'basic', 8),
        // 深度背景搜索
        this.performSingleSearch(`${query} 创业历程 教育背景 工作经历`, 'advanced', 10),
      ];

      const searchResults = await Promise.allSettled(searchPromises);

      // 合并所有搜索结果
      let formattedResponse = `# 关于"${query}"的综合信息报告\n\n`;

      searchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const sectionTitles = ['## 主要信息', '## 关系网络', '## 最新动态', '## 深度背景'];
          formattedResponse += `${sectionTitles[index] || `## 搜索结果 ${index + 1}`}\n\n`;
          formattedResponse += result.value + '\n\n';
        }
      });

      this.logger.log(`✅ 联网搜索服务查询成功: ${query}`);
      return formattedResponse;
    } catch (error) {
      this.logger.error(
        `联网搜索服务查询错误 ${query}:`,
        (error as Error).message,
      );
      throw new Error(`联网搜索服务错误: ${(error as Error).message}`);
    }
  }

  /**
   * 执行单次搜索
   */
  private async performSingleSearch(
    query: string,
    depth: 'basic' | 'advanced',
    maxResults: number
  ): Promise<string> {
    const response: AxiosResponse<TavilyResponse> = await axios.post(
      `${this.apiUrl}/search`,
      {
        api_key: this.apiKey,
        query: query,
        search_depth: depth,
        include_answer: true,
        include_raw_content: true,
        max_results: maxResults,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 90000, // 90 seconds timeout for comprehensive search
      },
    );

    let formattedResponse = '';

    if (response.data.answer) {
      formattedResponse += `**综合答案**: ${response.data.answer}\n\n`;
    }

    if (response.data.results && response.data.results.length > 0) {
      formattedResponse += `**详细搜索结果**:\n\n`;

      response.data.results.forEach((result, index) => {
        formattedResponse += `### ${index + 1}. ${result.title}\n`;
        formattedResponse += `**来源**: ${result.url}\n\n`;
        formattedResponse += `${result.content}\n\n`;

        if (result.raw_content && result.raw_content.length > 100) {
          // 提取更多原始内容
          const cleanContent = result.raw_content
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 800);
          formattedResponse += `**详细内容**: ${cleanContent}...\n\n`;
        }

        formattedResponse += '---\n\n';
      });
    }

    return formattedResponse;
  }

  /**
   * Search for avatar image URL based on entity name and tag
   * @param name - Name of the person or company
   * @param tag - Type of entity ('person' or 'company')
   * @returns Promise<string | null> - Avatar URL or null if not found
   */
  async searchAvatar(
    name: string,
    tag: 'person' | 'company',
  ): Promise<string | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn(
          '联网搜索服务密钥未配置，跳过头像搜索',
        );
        return null;
      }

      // Construct search query based on entity type
      const searchQuery =
        tag === 'person'
          ? `${name} profile photo headshot portrait`
          : `${name} company logo official`;

      this.logger.log(`Searching avatar for: ${name} (${tag})`);

      const response: AxiosResponse<TavilyResponse> = await axios.post(
        `${this.apiUrl}/search`,
        {
          api_key: this.apiKey,
          query: searchQuery,
          search_depth: 'basic',
          include_images: true,
          include_answer: false,
          max_results: 5,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      // Extract images from response
      const images = response.data.images || [];
      if (images.length > 0) {
        // Return the first available image without strict filtering
        const firstImage = images[0];
        if (firstImage) {
          this.logger.log(`Found avatar for ${name}: ${firstImage}`);
          return firstImage;
        }
      }

      // Try fallback search with different query if no images found
      if (images.length === 0) {
        const fallbackQuery =
          tag === 'person' ? `${name} photo image` : `${name} logo`;

        const fallbackResponse: AxiosResponse<TavilyResponse> =
          await axios.post(
            `${this.apiUrl}/search`,
            {
              api_key: this.apiKey,
              query: fallbackQuery,
              search_depth: 'basic',
              include_images: true,
              include_answer: false,
              max_results: 3,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            },
          );

        const fallbackImages = fallbackResponse.data.images || [];
        if (fallbackImages.length > 0) {
          const fallbackImage = fallbackImages[0];
          this.logger.log(
            `Found fallback avatar for ${name}: ${fallbackImage}`,
          );
          return fallbackImage;
        }
      }

      this.logger.log(`No suitable avatar found for ${name}`);
      return null;
    } catch (error) {
      this.logger.error(
        `联网搜索服务头像查询错误 ${name}:`,
        (error as Error).message,
      );
      return null;
    }
  }

  /**
   * Validate if URL is a valid image URL
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();
      const validExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
      ];

      // Check file extension
      const hasValidExtension = validExtensions.some((ext) =>
        pathname.endsWith(ext),
      );

      // Check for common image hosting domains
      const imageHosts = [
        'imgur.com',
        'i.imgur.com',
        'pbs.twimg.com',
        'twitter.com',
        'linkedin.com',
        'media.licdn.com',
        'github.com',
        'avatars.githubusercontent.com',
        'gravatar.com',
        'googleusercontent.com',
        'facebook.com',
        'scontent.xx.fbcdn.net',
        'instagram.com',
        'scontent.cdninstagram.com',
      ];

      const isFromImageHost = imageHosts.some((host) =>
        parsedUrl.hostname.includes(host),
      );

      return (
        hasValidExtension ||
        isFromImageHost ||
        url.includes('profile') ||
        url.includes('avatar')
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if image URL appears to be high quality based on entity type
   */
  private isHighQualityImage(url: string, tag: 'person' | 'company'): boolean {
    const urlLower = url.toLowerCase();

    if (tag === 'person') {
      // Prefer professional profile photos
      const goodSources = ['linkedin', 'twitter', 'github', 'gravatar'];
      const badIndicators = ['thumb', 'small', '32x32', '64x64', 'icon'];

      const hasGoodSource = goodSources.some((source) =>
        urlLower.includes(source),
      );
      const hasBadIndicator = badIndicators.some((indicator) =>
        urlLower.includes(indicator),
      );

      return hasGoodSource && !hasBadIndicator;
    } else {
      // For companies, prefer logos
      const goodIndicators = ['logo', 'brand', 'company'];
      const badIndicators = ['thumb', 'small', 'favicon', '16x16', '32x32'];

      const hasGoodIndicator = goodIndicators.some((indicator) =>
        urlLower.includes(indicator),
      );
      const hasBadIndicator = badIndicators.some((indicator) =>
        urlLower.includes(indicator),
      );

      return hasGoodIndicator && !hasBadIndicator;
    }
  }
}
