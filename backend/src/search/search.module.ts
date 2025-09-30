import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Article } from '../articles/entities/article.entity';
import { ArticleTranslation } from '../articles/entities/article-translation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Article, ArticleTranslation])],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
