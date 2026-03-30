import UserManagementPopover from './UserManagementPopover';

/**
 * FloatingUsersPopover - Wrapper for UserManagementPopover with Server Settings.
 * Used when opening from the main menu (Users item).
 * For other contexts (OS, Clientes, etc.), use UserManagementPopover directly with showServerSettings={false}.
 */
const FloatingUsersPopover = ({ desktop, isMenuExpanded, isVisible, onClose, userId = null }) => {
  return (
    <UserManagementPopover
      desktop={desktop}
      isMenuExpanded={isMenuExpanded}
      isVisible={isVisible}
      onClose={onClose}
      userId={userId}
      showServerSettings={true}
    />
  );
};

export default FloatingUsersPopover;
