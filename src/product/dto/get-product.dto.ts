import { Type } from 'class-transformer';
import { IsOptional, IsPositive } from 'class-validator';

export class GetProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'Page must be positive' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'Limit must be positive' })
  limit?: number = 10;
}
