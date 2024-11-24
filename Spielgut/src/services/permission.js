const PERMISSIONS = {
    ADMIN: ['manage_users', 'create_post', 'send_message', 'view_content'],
    REGISTERED: ['create_post', 'send_message', 'view_content'],
    UNREGISTERED: ['view_content']
  };
  
  export function hasPermission(userRole, permission) {
    if (!PERMISSIONS[userRole]) {
      return false;
    }
    return PERMISSIONS[userRole].includes(permission);
  }