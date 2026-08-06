import { colors } from '@/src/theme';
import TicketList from '@/src/components/TicketList';

export default function ChefPreparing() {
  return (
    <TicketList
      status="preparing"
      title="Preparing"
      emptyText="Nothing on the stove right now."
      emptyIcon="flame-outline"
      action={{
        label: 'Mark Complete',
        icon: 'checkmark-done',
        nextStatus: 'completed',
        color: colors.success,
      }}
    />
  );
}
