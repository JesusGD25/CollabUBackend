import { IsArray, IsString } from 'class-validator';

export class ResolveSkillsByNamesDto {
  @IsArray()
  @IsString({ each: true })
  names: string[];
}
