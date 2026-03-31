export class QuotaResponseDto {
  maxStorageBytes: number;
  usedStorageBytes: number;
  usedPercentage: number;
  maxFileSizeBytes: number;
  totalFiles: number;
  maxFiles: number;
  remainingBytes: number;
}
