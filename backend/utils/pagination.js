/**
 * Builds pagination response object */
const buildPagination = (page, limit, total, data, itemName = 'items') => {
  const currentPage = parseInt(page);
  const limitNum = parseInt(limit);
  const totalPages = Math.ceil(total / limitNum);
  const skip = (currentPage - 1) * limitNum;
  
  return {
    currentPage,
    totalPages,
    [`total${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`]: total,
    hasNext: skip + data.length < total,
    hasPrev: currentPage > 1
  };
};

module.exports = {
  buildPagination
};
