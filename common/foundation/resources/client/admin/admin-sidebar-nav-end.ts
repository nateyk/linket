/** Minimal shape used for admin sidebar NavLink `end` decisions. */
export type SidebarNavActionItem = {
  action: string;
};

/**
 * Decide whether a sidebar NavLink should use exact (`end`) matching.
 *
 * Parents like `/admin/settings` must not stay `aria-current="page"` when a
 * more-specific sibling (e.g. Help center → `/admin/settings/hc`) matches the
 * current path. Other settings children without their own sidebar entry still
 * keep the Settings item active via prefix matching.
 */
export function shouldEndMatchSidebarItem(
  item: SidebarNavActionItem,
  pathname: string,
  siblings: SidebarNavActionItem[],
): boolean {
  if (item.action === '/admin') {
    return true;
  }

  return siblings.some(other => {
    if (other.action === item.action) {
      return false;
    }
    if (!other.action.startsWith(`${item.action}/`)) {
      return false;
    }

    return (
      pathname === other.action || pathname.startsWith(`${other.action}/`)
    );
  });
}
