export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  correlationId?: string;
  data: Record<string, any>;
}
