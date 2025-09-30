import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  create(@Body() createArticleDto: CreateArticleDto, @Request() req) {
    return this.articlesService.create(createArticleDto, req.user.id);
  }

  @Get()
  findAll(@Query('language') language?: string, @Query('categoryId') categoryId?: number) {
    return this.articlesService.findAll(language, categoryId);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string, @Query('language') language?: string) {
    return this.articlesService.findBySlug(slug, language);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('language') language?: string) {
    return this.articlesService.findOne(+id, language);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator')
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(+id, updateArticleDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(+id);
  }

  @Post(':id/like')
  like(@Param('id') id: string) {
    return this.articlesService.like(+id);
  }
}
