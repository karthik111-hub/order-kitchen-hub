import TicketList from '@/src/components/TicketList';

export default function ChefCompleted() {
  return (
    <TicketList
      status="completed"
      title="Completed"
      emptyText="Completed tickets will show up here."
      emptyIcon="checkmark-done-outline"
    />
  );
}
