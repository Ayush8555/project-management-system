export const getAvatarUrl = (name) => {
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || 'User')}&backgroundColor=4f46e5,7c3aed,2563eb&textColor=ffffff`;
};
