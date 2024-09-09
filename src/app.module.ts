import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog.module';
import { AdminModule } from './admin.module';

@Module({
  imports: [CatalogModule, AdminModule]
})
export class AppModule {}