import React from 'react';
import { getInitials, getAvatarColor } from '../utils/avatarUtils';

export const Avatar = ({ 
  user, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  // If user has a custom avatar, use it
  if (user?.avatar && user.avatar !== '') {
    return (
      <img 
        src={user.avatar} 
        alt={user.name || 'User'} 
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // If image fails to load, hide it and show initials instead
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  // Default to initials avatar
  const initials = getInitials(user?.name || 'User');
  const colorClass = getAvatarColor(user?.name || 'User');

  return (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center text-white font-medium ${className}`}>
      {initials}
    </div>
  );
};