/**
 * Centralized Eligibility Filter Engine
 * Used across elections for voter/candidate eligibility
 */

/**
 * Apply eligibility filters to a list of users
 * @param {Array} users - Array of user objects
 * @param {Object} filters - Filter criteria from election position
 * @param {Object} scopeConfig - Scope type and ID for hard boundary
 * @returns {Array} filtered users
 */
function applyEligibilityFilters(users, filters = {}, scopeConfig = {}) {
  let eligible = [...users];

  // ── Hard boundary: scope ────────────────────────────────────────────────────
  if (scopeConfig.scopeType && scopeConfig.scopeId) {
    eligible = eligible.filter((u) => {
      switch (scopeConfig.scopeType) {
        case "SCHOOL":
        case "COLLEGE":
          return u.institution_name === scopeConfig.scopeId ||
            u.institution_id === scopeConfig.scopeId;
        case "COMPANY":
          return u.company_name === scopeConfig.scopeId ||
            u.company_id === scopeConfig.scopeId;
        case "MUNICIPALITY":
          return u.municipality === scopeConfig.scopeId;
        case "DISTRICT":
          return u.district === scopeConfig.scopeId;
        case "PROVINCE":
          return u.province === scopeConfig.scopeId;
        default:
          return true;
      }
    });
  }

  // ── Soft filters ────────────────────────────────────────────────────────────

  // Filter by roles
  if (filters.roles?.length) {
    eligible = eligible.filter((u) => {
      const userRoles = parseJSON(u.user_roles, []);
      return filters.roles.some((r) => userRoles.includes(r));
    });
  }

  // Filter by batch
  if (filters.batch?.length) {
    eligible = eligible.filter((u) => filters.batch.includes(u.batch));
  }

  // Filter by gender
  if (filters.gender?.length) {
    eligible = eligible.filter((u) => filters.gender.includes(u.gender));
  }

  // Filter by class
  if (filters.class?.length) {
    eligible = eligible.filter((u) => filters.class.includes(u.class));
  }

  // Filter by occupation / job_role
  if (filters.occupation?.length) {
    eligible = eligible.filter((u) => filters.occupation.includes(u.job_role));
  }

  // Filter by location
  if (filters.location) {
    if (filters.location.district?.length) {
      eligible = eligible.filter((u) =>
        filters.location.district.includes(u.district)
      );
    }
    if (filters.location.municipality?.length) {
      eligible = eligible.filter((u) =>
        filters.location.municipality.includes(u.municipality)
      );
    }
    if (filters.location.province?.length) {
      eligible = eligible.filter((u) =>
        filters.location.province.includes(u.province)
      );
    }
  }

  // Custom field filters
  if (filters.custom_filters && Object.keys(filters.custom_filters).length) {
    eligible = eligible.filter((u) => {
      const customFields = parseJSON(u.custom_fields, {});
      return Object.entries(filters.custom_filters).every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(customFields[key]);
        return customFields[key] === value;
      });
    });
  }

  return eligible;
}

/**
 * Get eligible voters for a specific election position
 */
function getEligibleVoters(allUsers, electionConfig, positionIndex = 0) {
  const position = electionConfig.positions?.[positionIndex];
  if (!position) return allUsers;

  const scopeConfig = {
    scopeType: electionConfig.scope_type,
    scopeId: electionConfig.scope_id,
  };

  return applyEligibilityFilters(
    allUsers,
    position.eligible_voters || {},
    scopeConfig
  );
}

/**
 * Check if a single user is eligible for a position
 */
function isUserEligible(user, electionConfig, positionConfig) {
  const eligible = applyEligibilityFilters(
    [user],
    positionConfig?.eligible_voters || {},
    {
      scopeType: electionConfig.scope_type,
      scopeId: electionConfig.scope_id,
    }
  );
  return eligible.length > 0;
}

function parseJSON(val, fallback) {
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

module.exports = { applyEligibilityFilters, getEligibleVoters, isUserEligible };