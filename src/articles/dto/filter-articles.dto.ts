import { IsOptional, IsInt, Min, IsString, IsDateString } from 'class-validator';

export class FilterArticlesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsInt()
  authorId?: number;

  @IsOptional()
  @IsDateString()
  publishedFrom?: string;

  @IsOptional()
  @IsDateString()
  publishedTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
