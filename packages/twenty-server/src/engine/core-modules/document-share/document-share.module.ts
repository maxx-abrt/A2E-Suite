import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentShareEntity } from 'src/engine/core-modules/document-share/document-share.entity';
import { DocumentShareResolver } from 'src/engine/core-modules/document-share/document-share.resolver';
import { DocumentShareService } from 'src/engine/core-modules/document-share/document-share.service';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentShareEntity])],
  exports: [DocumentShareService],
  providers: [DocumentShareService, DocumentShareResolver],
})
export class DocumentShareModule {}
