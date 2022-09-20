import {
  AmplicationLogger,
  AMPLICATION_LOGGER_PROVIDER,
} from '@amplication/nest-logger-module';
import { Controller, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { KafkaMessage } from 'kafkajs';
import { GENERATE_PULL_REQUEST_TOPIC } from '../../constants';
import { EnvironmentVariables } from '../../services/environmentVariables';
import { SendPullRequestArgs } from './dto/sendPullRequest';
import { PullRequestService } from './pull-request.service';
import { QueueService } from './queue.service';

@Controller()
export class PullRequestController {

  private readonly createPullRequestCompleted: string;

  constructor(
    private readonly pullRequestService: PullRequestService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    @Inject(AMPLICATION_LOGGER_PROVIDER)
    private readonly logger: AmplicationLogger
  ) {
    this.createPullRequestCompleted = this.configService.get<string>("CREATE_PULL_REQUEST_COMPLETED_TOPIC") ?? "";
  }


  @EventPattern(EnvironmentVariables.get(GENERATE_PULL_REQUEST_TOPIC, true))
  async generatePullRequest(
    @Payload() message: KafkaMessage,
    @Ctx() context: KafkaContext
  ) {
    const validArgs = plainToInstance(SendPullRequestArgs, message.value);
    await validateOrReject(validArgs);
    this.logger.info(`Got a new generate pull request item from queue.`, {
      topic: context.getTopic(),
      partition: context.getPartition(),
      offset: message.offset,
      class: this.constructor.name,
      args: validArgs,
    });

    try {
      const pullRequest = await this.pullRequestService.createPullRequest(
        validArgs
      );

      this.logger.info(`Finish process, committing`, {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: message.offset,
        class: this.constructor.name,
        buildId: validArgs.newBuildId,
      });

      const response = { url: pullRequest, buildId: validArgs.newBuildId };

      this.queueService.emitMessage(
        this.createPullRequestCompleted,
        JSON.stringify(response),
      );

    } catch (error) {
      this.logger.error(error, {
        class: this.constructor.name,
        offset: message.offset,
        buildId: validArgs.newBuildId,
      });

      const response = { 
        buildId: validArgs.newBuildId,
        errorMessage: error.message
      };

      this.queueService.emitMessage(
        this.createPullRequestCompleted,
        JSON.stringify(response),
      );
    }
  }
}
