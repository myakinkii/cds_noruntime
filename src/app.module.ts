import { Module } from '@nestjs/common';
import { CatalogModulde } from './catalog.module';
import { AdminModule } from './admin.module';

@Module({
  imports: [CatalogModulde, AdminModule]
})
export class AppModule {}