// Avatar utility functions

/**
 * Generate initials from a user's name
 * @param {string} name - User's full name
 * @returns {string} - User's initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate a consistent background color based on the user's name
 * @param {string} name - User's name
 * @returns {string} - CSS background color class
 */
export const getAvatarColor = (name) => {
  if (!name) return 'bg-gray-500';
  
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-yellow-500',
    'bg-red-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500'
  ];
  
  // Generate a consistent index based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Generate default hero image gradients
 * @returns {Array} - Array of gradient classes
 */
export const getHeroGradients = () => [
  'bg-gradient-to-r from-blue-600 to-purple-600',
  'bg-gradient-to-r from-green-500 to-blue-600',
  'bg-gradient-to-r from-purple-500 to-pink-500',
  'bg-gradient-to-r from-yellow-400 to-orange-500',
  'bg-gradient-to-r from-teal-400 to-blue-500'
];