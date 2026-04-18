import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class CreateTagDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  tags: string[];
}
