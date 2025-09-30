import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Query('language') language?: string,
    @Query('categoryId') categoryId?: number,
  ) {
    return this.searchService.searchArticles(query, language, categoryId);
  }

  @Get('popular')
  getPopular(
    @Query('language') language?: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getPopularArticles(language, limit);
  }

  @Get('recent')
  getRecent(
    @Query('language') language?: string,
    @Query('limit') limit?: number,
  ) {
    return this.searchService.getRecentArticles(language, limit);
  }
}
