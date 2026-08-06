import { colors } from '@/src/theme';
import TicketList from '@/src/components/TicketList';

export default function ChefPending() {
  return (
    <TicketList
      status="pending"
      title="Pending"
      emptyText="No pending orders. Take a breather."
      emptyIcon="hourglass-outline"
      action={{
        label: 'Start Preparing',
        icon: 'flame-outline',
        nextStatus: 'preparing',
        color: colors.warning,
      }}
    />
  );
}
