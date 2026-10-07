import {ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength} from 'class-validator';
import type {FilterSort} from './stock-filter.types';
export class StockFilterQueryDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({each: true})
  @MaxLength(512, {each: true})
  selectedIds!: string[];
  @IsString()
  @MinLength(1)
  @MaxLength(1500)
  runId!: string;
  @IsOptional()
  @IsIn(['symbol', 'overall', 'risk'])
  sort: FilterSort = 'symbol';
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  offset = 0;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}