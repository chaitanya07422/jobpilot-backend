import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Body,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserDocument } from '../auth/schemas';
import { successResponse } from '../shared/helpers';
import { MAX_RESUME_SIZE_BYTES } from './constants/resume.constants';
import { UpdateResumeProfileDto } from './dto/update-resume-profile.dto';
import { ResumesService } from './services/resumes.service';

@ApiTags('Resumes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  @ApiOperation({ summary: 'List resumes for the current user (max 1)' })
  async list(@CurrentUser() user: UserDocument) {
    const resumes = await this.resumesService.findAllForUser(
      user._id.toString(),
    );
    return successResponse(resumes, 'Resumes fetched');
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upload or replace the user resume (PDF, max 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RESUME_SIZE_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const resume = await this.resumesService.upload(user, file);
    return successResponse(resume, 'Resume uploaded and profile extracted');
  }

  @Get('quota')
  @ApiOperation({ summary: 'Get resume upload quota for the current user' })
  async getQuota(@CurrentUser() user: UserDocument) {
    const quota = await this.resumesService.getQuotaForUser(user);
    return successResponse(quota, 'Resume quota fetched');
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get extracted resume profile for the current user',
  })
  async getProfile(@CurrentUser() user: UserDocument) {
    const profile = await this.resumesService.getProfileForUser(
      user._id.toString(),
    );
    return successResponse(profile, 'Resume profile fetched');
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update extracted resume profile (profile editor)' })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateResumeProfileDto,
  ) {
    const profile = await this.resumesService.updateProfileForUser(
      user._id.toString(),
      dto,
    );
    return successResponse(profile, 'Resume profile updated');
  }

  @Post('profile/confirm')
  @ApiOperation({ summary: 'Confirm resume profile after review' })
  async confirmProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateResumeProfileDto,
  ) {
    const profile = await this.resumesService.confirmProfileForUser(
      user._id.toString(),
      dto,
    );
    return successResponse(profile, 'Resume profile confirmed');
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download the stored resume file' })
  async downloadFile(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    const { stream, resume } = await this.resumesService.getFileForUser(
      user._id.toString(),
      id,
    );

    return new StreamableFile(stream, {
      type: resume.mimeType,
      disposition: `inline; filename="${resume.fileName}"`,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the current user resume' })
  async remove(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    await this.resumesService.deleteForUser(user._id.toString(), id);
    return successResponse(null, 'Resume deleted');
  }
}
