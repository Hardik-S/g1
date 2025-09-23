import React from 'react';
import { APP_CATEGORIES } from '../../apps/registry';

const CategoryNav = ({ categories, onSelectCategory, selectedCategory }) => (
  <nav className="category-nav">
    {categories.map((category) => (
      <button
        key={category}
        className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
        onClick={() => onSelectCategory(category)}
      >
        {category !== 'All' && (
          <span className="category-icon">
            {APP_CATEGORIES[category]?.icon}
          </span>
        )}
        {category}
      </button>
    ))}
  </nav>
);

export default CategoryNav;
