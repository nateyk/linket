import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('course builder uploads', () => {
  test('reports upload and attachment failures for lesson files', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      "toast.danger('Unable to attach the uploaded video')",
    );
    expect(source).toContain("toast.danger('Unable to attach the resource')");
    expect(source.match(/showToastOnRestrictionFail: true/g)).toHaveLength(3);
    expect(source.match(/showToastOnBackendError: true/g)).toHaveLength(3);
  });
});

describe('course builder analytics navigation', () => {
  test('uses the Base UI render API for the analytics link', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /render=\{\s*<Link\s+to=\{`\/dashboard\/my-products\/\$\{productId\}\/course\/analytics`\}\s*\/>\s*\}/,
    );
  });

  test('selects the requested lesson after loading its course', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('lessonId')");
    expect(source).toContain('requestedLesson');
  });
});

describe('course builder data loading', () => {
  test('loads product, course, and Storefront data through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/digital-products\/\$\{productId\}`\s*,?\s*\)/,
    );
    expect(source).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/courses\/\$\{courseId\}`\s*,?\s*\)/,
    );
    expect(source).toMatch(
      /apiClient\s*\.get\(\s*'\/api\/v1\/biolinks\?fields_preset=minimal'\s*,?\s*\)/,
    );
  });
});

describe('course builder mobile navigation', () => {
  test('uses opposite phone visibility conditions for curriculum and editor', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /useState<'curriculum' \| 'editor'>\(\s*'curriculum',?\s*\)/,
    );
    expect(source).toMatch(
      /w-full min-w-0 flex-col overflow-hidden border-b bg-card lg:w-\[36%\] lg:border-r lg:border-b-0',\s*mobileSurface === 'editor' && 'hidden lg:flex'/,
    );
    expect(source).toMatch(
      /min-w-0 flex-1 flex-col overflow-y-auto bg-muted\/10 p-4',\s*mobileSurface === 'curriculum' && 'hidden lg:flex'/,
    );
  });

  test('opens the editor when selecting or creating a lesson', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /onClick=\{\(\) => \{\s*setSelectedLesson\(lesson\);\s*setSelectedChapterId\(chapter\.id\);\s*setMobileSurface\('editor'\);\s*\}\}/,
    );
    expect(source).toMatch(
      /const addLesson = async \(chapterId: number\) => \{[\s\S]*?setSelectedLesson\(lesson\);\s*setSelectedChapterId\(chapterId\);\s*setMobileSurface\('editor'\);/,
    );
  });

  test('provides a phone-only back action wired to the editor callback', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /function LessonEditor\([\s\S]*?className="self-start lg:hidden"\s*onClick=\{onBackToCurriculum\}[\s\S]*?<Trans message="Back to curriculum" \/>/,
    );
    expect(source).toContain(
      "onBackToCurriculum={() => setMobileSurface('curriculum')}",
    );
  });

  test('moves all secondary actions into the accessible phone menu', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );
    const menuStart = source.indexOf('aria-label="Course actions"');
    const menuEnd = source.indexOf('</Dropdown.Content>', menuStart);
    const menu = source.slice(menuStart, menuEnd);

    expect(menu).toContain('aria-label="Course actions"');
    expect(menu).toMatch(
      /<Dropdown\.Item\s+onClick=\{\(\) =>\s*window\.open\([\s\S]*?<Trans message="Preview" \/>/,
    );
    expect(menu).toContain(
      '<Dropdown.Item onClick={() => setSettingsOpen(true)}>',
    );
    expect(menu).toContain('<Trans message="Configure" />');
    expect(menu).toMatch(
      /<Dropdown\.Item\s+render=\{[\s\S]*?<Link\s+to=\{`\/dashboard\/my-products\/\$\{productId\}\/course\/analytics`\}[\s\S]*?\}\s*>[\s\S]*?Analytics/,
    );
  });
});

describe('course builder curriculum sorting', () => {
  test('removes the overview cards and persists chapter and lesson ordering', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).not.toContain('<StatCard');
    expect(source).toContain('@ui/interactions/dnd/sortable/use-sortable');
    expect(source).toContain('/chapters/reorder');
    expect(source).toContain('/lessons/reorder');
  });

  test('delegates phone move actions to the existing optimistic reorders', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    const chapterHelper = source.match(
      /const moveChapterByOffset = \(chapterId: number, offset: number\) => \{[\s\S]*?void reorderChapters\(oldIndex, newIndex\);[\s\S]*?\n {2}\};/,
    )?.[0];
    const lessonHelper = source.match(
      /const moveLessonByOffset = \([\s\S]*?void reorderLessons\(chapterId, oldIndex, newIndex\);[\s\S]*?\n {2}\};/,
    )?.[0];

    expect(chapterHelper).toBeDefined();
    expect(lessonHelper).toBeDefined();
  });

  test('provides boundary-safe chapter and lesson move menu actions', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );
    const chapterMenuStart = source.indexOf('aria-label="Chapter actions"');
    const chapterMenuEnd = source.indexOf(
      '</Dropdown.Content>',
      chapterMenuStart,
    );
    const chapterMenu = source.slice(chapterMenuStart, chapterMenuEnd);
    const lessonMenuStart = source.indexOf('aria-label="Lesson actions"');
    const lessonMenuEnd = source.indexOf(
      '</Dropdown.Content>',
      lessonMenuStart,
    );
    const lessonMenu = source.slice(lessonMenuStart, lessonMenuEnd);

    expect(chapterMenu).toMatch(
      /disabled=\{\s*chapterIndex === 0 \|\| !!reordering\s*\}[\s\S]*?moveChapterByOffset\(chapter\.id, -1\)[\s\S]*?<Trans message="Move up" \/>/,
    );
    expect(chapterMenu).toMatch(
      /disabled=\{[\s\S]*?chapterIndex ===\s*course\.chapters\.length - 1 \|\|[\s\S]*?!!reordering[\s\S]*?\}[\s\S]*?moveChapterByOffset\(chapter\.id, 1\)[\s\S]*?<Trans message="Move down" \/>/,
    );
    expect(lessonMenu).toMatch(
      /disabled=\{[\s\S]*?lessonIndex === 0 \|\|\s*!!reordering[\s\S]*?\}[\s\S]*?moveLessonByOffset\([\s\S]*?chapter\.id,[\s\S]*?lesson\.id,[\s\S]*?-1,[\s\S]*?\)[\s\S]*?<Trans message="Move up" \/>/,
    );
    expect(lessonMenu).toMatch(
      /disabled=\{[\s\S]*?lessonIndex ===[\s\S]*?chapter\.lessons\.length -\s*1 \|\|[\s\S]*?!!reordering[\s\S]*?\}[\s\S]*?moveLessonByOffset\([\s\S]*?chapter\.id,[\s\S]*?lesson\.id,[\s\S]*?1,[\s\S]*?\)[\s\S]*?<Trans message="Move down" \/>/,
    );
    expect(source).toContain('hidden lg:block');
  });
});

describe('course settings and builder polish', () => {
  test('exposes cover image, course name and collapsible curriculum with simplified header', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('Cover Image');
    expect(source).toContain('Course Name');
    expect(source).toContain('Collapsible');
    expect(source).toContain('max-w-2xl');
  });

  test('uses a bottom Drawer for phone settings and a Dialog on desktop', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain("import {Drawer} from '@shadcn/drawer/drawer'");
    expect(source).toContain('<Drawer.Root');
    expect(source).toContain('position="bottom"');
    expect(source).toContain('className="lg:hidden"');
    expect(source).toContain('<Dialog.Root');
    expect(source).toContain(
      'className="hidden max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl lg:flex"',
    );
    expect(source).toContain('<Drawer.Body>');
    expect(source).toContain('<Drawer.Footer');
  });

  test('guards dirty settings dismissal with a discard confirmation', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      'const [discardOpen, setDiscardOpen] = useState(false)',
    );
    expect(source).toContain('const isDirty =');
    expect(source).toContain('if (!nextOpen && isDirty)');
    expect(source).toContain('<Trans message="Discard changes?" />');
  });

  test('guards settings saves and leaves the form open on failure', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );
    const settingsDialog = source.slice(
      source.indexOf('function CourseSettingsDialog'),
      source.indexOf('function DeleteCourseItemDialog'),
    );

    expect(settingsDialog).toContain(
      'const [saving, setSaving] = useState(false)',
    );
    expect(settingsDialog).toContain('if (!nextOpen && saving) return;');
    expect(settingsDialog).toMatch(
      /const save = async \(\) => \{[\s\S]*?if \(saving\) return;[\s\S]*?setSaving\(true\);[\s\S]*?try \{[\s\S]*?await apiClient\.put\([\s\S]*?biolink_ids: biolinkIds,[\s\S]*?toast\.positive\('Settings saved'\);[\s\S]*?onOpenChange\(false\);[\s\S]*?onSaved\(\);[\s\S]*?\} catch \(e: any\) \{[\s\S]*?toast\.danger\(e\.message \?\? 'Unable to save settings'\);[\s\S]*?\} finally \{[\s\S]*?setSaving\(false\);/,
    );
    expect(settingsDialog.match(/disabled=\{saving\}/g)).toHaveLength(6);
  });

  test('replaces browser confirmation with a pending-aware AlertDialog', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      "import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog'",
    );
    expect(source).not.toContain('confirm(');
    expect(source).toContain('const [pendingDelete, setPendingDelete]');
    expect(source).toContain('<DeleteCourseItemDialog');
    expect(source).toContain('disabled={deleting}');
    expect(source).toContain("toast.danger('Unable to delete'");
  });

  test('clears the active editor when deleting its chapter', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /pendingDelete\.type === 'chapter'[\s\S]*?selectedLesson\?\.chapter_id === pendingDelete\.item\.id/,
    );
    expect(source).toContain("setMobileSurface('curriculum')");
  });
});

describe('course builder UI polish', () => {
  test('uses shared loading and scrolling primitives for the curriculum', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain("import {Spinner} from '@shadcn/spinner/spinner'");
    expect(source).toContain('@shadcn/scroll-area/scroll-area');
    expect(source).toContain('role="status"');
    expect(source).toContain('<ScrollArea className="min-h-0 flex-1">');
    expect(source).toContain('<ScrollAreaViewport className="p-3">');
    expect(source).toContain('<ScrollAreaScrollBar onlyShowOnHover />');
    expect(source).toContain('group-data-panel-open:rotate-180');
  });

  test('uses an icon back action and does not expose the internal instructor ID', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('ArrowLeftIcon');
    expect(source).toMatch(
      /<ArrowLeftIcon data-icon="inline-start"\s*\/>\s*<Trans message="Back to curriculum" \/>/,
    );
    expect(source).not.toContain('ID {course.instructor_user_id}');
  });

  test('keeps lesson status badges visible without shrinking their label', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain('className="h-5 shrink-0 px-1.5 text-[10px]"');
  });
});

describe('course approval submission', () => {
  test('uses the standard product submission flow', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(source).toContain(
      '`/api/v1/digital-products/${course.digital_product_id}/submit`',
    );
    expect(source).toContain("toast.positive('Course submitted for review')");
    expect(source).toContain('const hasPublishedLesson =');
    expect(source).toContain("'Submit for review'");
    expect(source).toContain("'Add a published lesson'");
  });
});
