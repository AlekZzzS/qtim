import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { FilterArticlesDto } from './dto/filter-articles.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /**
   * GET /articles — список статей с пагинацией и фильтрацией
   * Query params: page, limit, authorId, authorName, publishedFrom, publishedTo, search
   */
  @Get()
  findAll(@Query() filters: FilterArticlesDto) {
    return this.articlesService.findAll(filters);
  }

  /** GET /articles/:id — получение статьи по ID */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.findOne(id);
  }

  /** POST /articles — создание статьи (требуется авторизация) */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateArticleDto, @Request() req) {
    return this.articlesService.create(dto, req.user.id);
  }

  /** PUT /articles/:id — обновление статьи (требуется авторизация) */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, dto);
  }

  /** DELETE /articles/:id — удаление статьи (требуется авторизация) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.remove(id);
  }
}
