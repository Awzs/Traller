import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface StreamingStep {
  step: string;
  status: 'started' | 'completed' | 'error';
  data?: any;
  error?: string;
  timestamp: number;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  /**
   * Initialize Server-Sent Events stream
   */
  initializeStream(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection message
    this.sendStreamEvent(res, 'connected', {
      message: '连接已建立',
      timestamp: Date.now(),
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      this.sendHeartbeat(res);
    }, 30000); // Every 30 seconds

    // Clean up on client disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.logger.debug('客户端断开连接');
    });
  }

  /**
   * Send streaming event to client
   */
  sendStreamEvent(res: Response, event: string, data: any): void {
    try {
      const eventData: StreamingStep = {
        step: event,
        status: 'completed',
        data,
        timestamp: Date.now(),
      };

      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
      this.logger.debug(`发送流事件: ${event}`);
    } catch (error) {
      this.logger.error(`发送流事件失败: ${(error as Error).message}`);
    }
  }

  /**
   * Send step start event
   */
  sendStepStart(res: Response, step: string, message: string): void {
    this.sendStreamEvent(res, 'step', {
      step,
      status: 'started',
      message,
      timestamp: Date.now(),
    });
  }

  /**
   * Send step completion event
   */
  sendStepComplete(res: Response, step: string, data: any, message?: string): void {
    this.sendStreamEvent(res, 'step', {
      step,
      status: 'completed',
      data,
      message: message || `${step} 完成`,
      timestamp: Date.now(),
    });
  }

  /**
   * Send step error event
   */
  sendStepError(res: Response, step: string, error: string): void {
    this.sendStreamEvent(res, 'step', {
      step,
      status: 'error',
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Send progress update
   */
  sendProgress(res: Response, current: number, total: number, message?: string): void {
    this.sendStreamEvent(res, 'progress', {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      message: message || `进度: ${current}/${total}`,
      timestamp: Date.now(),
    });
  }

  /**
   * Send final result
   */
  sendFinalResult(res: Response, result: any): void {
    this.sendStreamEvent(res, 'result', result);
    this.sendStreamEvent(res, 'complete', {
      message: '处理完成',
      timestamp: Date.now(),
    });
  }

  /**
   * Send error and close stream
   */
  sendError(res: Response, error: string, details?: any): void {
    this.sendStreamEvent(res, 'error', {
      error,
      details,
      timestamp: Date.now(),
    });
    res.end();
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(res: Response): void {
    try {
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
    } catch (error) {
      this.logger.warn(`心跳发送失败: ${(error as Error).message}`);
    }
  }

  /**
   * Close stream
   */
  closeStream(res: Response): void {
    try {
      res.end();
      this.logger.debug('流已关闭');
    } catch (error) {
      this.logger.warn(`关闭流失败: ${(error as Error).message}`);
    }
  }

  /**
   * Create a streaming wrapper for long-running operations
   */
  async streamOperation<T>(
    res: Response,
    operation: (sendUpdate: (step: string, data?: any) => void) => Promise<T>,
  ): Promise<void> {
    try {
      this.initializeStream(res);

      const sendUpdate = (step: string, data?: any) => {
        if (data) {
          this.sendStepComplete(res, step, data);
        } else {
          this.sendStepStart(res, step, `开始 ${step}`);
        }
      };

      const result = await operation(sendUpdate);
      this.sendFinalResult(res, result);
    } catch (error) {
      this.logger.error(`流操作失败: ${(error as Error).message}`);
      this.sendError(res, (error as Error).message);
    } finally {
      this.closeStream(res);
    }
  }

  /**
   * Create chunked response for large data
   */
  sendChunkedResponse(res: Response, data: any, chunkSize: number = 1000): void {
    try {
      const jsonString = JSON.stringify(data);
      const chunks: string[] = [];

      // Split data into chunks
      for (let i = 0; i < jsonString.length; i += chunkSize) {
        chunks.push(jsonString.slice(i, i + chunkSize));
      }

      this.initializeStream(res);
      
      // Send chunks with progress updates
      chunks.forEach((chunk, index) => {
        this.sendProgress(res, index + 1, chunks.length);
        this.sendStreamEvent(res, 'chunk', {
          index,
          chunk,
          isLast: index === chunks.length - 1,
        });
      });

      this.sendStreamEvent(res, 'complete', {
        message: '数据传输完成',
        totalChunks: chunks.length,
      });

    } catch (error) {
      this.logger.error(`分块响应失败: ${(error as Error).message}`);
      this.sendError(res, (error as Error).message);
    } finally {
      this.closeStream(res);
    }
  }

  /**
   * Handle timeout for long-running operations
   */
  withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = '操作超时',
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Create a timeout-aware streaming operation
   */
  async streamWithTimeout<T>(
    res: Response,
    operation: (sendUpdate: (step: string, data?: any) => void) => Promise<T>,
    timeoutMs: number = 240000, // 4 minutes default
  ): Promise<void> {
    try {
      await this.streamOperation(res, async (sendUpdate) => {
        return await this.withTimeout(
          operation(sendUpdate),
          timeoutMs,
          `操作超时 (${timeoutMs / 1000}秒)`,
        );
      });
    } catch (error) {
      this.logger.error(`超时流操作失败: ${(error as Error).message}`);
      this.sendError(res, (error as Error).message);
    }
  }
}
