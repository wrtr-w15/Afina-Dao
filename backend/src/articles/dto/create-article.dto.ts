import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleTranslationDto {
  @IsString()
  language: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

export class CreateArticleDto {
  @IsString()
  slug: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsNumber()
  categoryId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateArticleTranslationDto)
  translations: CreateArticleTranslationDto[];
}
