import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  type = 'button',
  className = '',
  disabled = false,
  icon = null
}) => {
  const baseStyles = 'px-6 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center justify-center gap-2';

  
  const variants = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800',
    secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
    outline: 'bg-transparent text-gray-900 border-2 border-black hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;