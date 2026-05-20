#!/bin/bash
# This script resolves merge conflicts in the 3 files by taking HEAD as base
# and incorporating unique additions from the roles branch

# 1. For schema.prisma - use HEAD as base, it's the most complete
cp scratch/schema_head.prisma backend/prisma/schema.prisma

# 2. For AdminRoutes.jsx - use HEAD as base (has enhanced UI, tabs, exports)  
cp scratch/routes_head.jsx frontend/src/pages/admin/AdminRoutes.jsx

# 3. For AdminUsers.jsx - use HEAD as base (has enhanced UI)
cp scratch/users_head.jsx frontend/src/pages/admin/AdminUsers.jsx

echo "Base files restored from HEAD. Now applying roles-specific additions via node script..."
