import { ApiProperty } from "@nestjs/swagger";

export class PaginationMetaDto {
  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: "Number of items per page",
    example: 25,
  })
  pageSize: number;

  @ApiProperty({
    description: "Total number of items across all pages",
    example: 100,
  })
  total: number;
}

export class PaginatedResponseDto<T> {
  items: T[];
  pagination: PaginationMetaDto;

  constructor(items: T[], page: number, pageSize: number, total: number) {
    this.items = items;
    this.pagination = { page, pageSize, total };
  }
}
