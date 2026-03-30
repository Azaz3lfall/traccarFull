import ClientFormModal from '../../../components/ClientFormModal';

/**
 * ClientCreateModal - Wrapper for ClientFormModal used in OS (CreateOS) context.
 * Always creates new client (clientId=null), full form (compact=false).
 */
const ClientCreateModal = ({ open, onClose, onSuccess }) => {
  return (
    <ClientFormModal
      open={open}
      onClose={onClose}
      clientId={null}
      onSuccess={onSuccess}
      compact={false}
    />
  );
};

export default ClientCreateModal;
