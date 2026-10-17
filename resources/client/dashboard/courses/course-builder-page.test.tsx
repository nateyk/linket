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
    // Lesson resources and video upload through the shared uploader, and the
    // cover now uses the shared CroppedCover — no inline upload config remains.
    expect(source).toContain('<SharedFileUploader');
    expect(source).toContain('uploadType="courseResources"');
    expect(source).toContain('uploadType="courseVideos"');
    expect(source.match(/showToastOnRestrictionFail: true/g)).toBeNull();
    expect(source.match(/showToastOnBackendError: true/g)).toBeNull();
    const uploaderSource = fs.readFileSync(
      path.resolve('common/foundation/resources/client/ui/file-uploader.tsx'),
      'utf8',
    );
    expect(uploaderSource).toContain('showToastOnRestrictionFail: true');
    expect(uploaderSource).toContain('showToastOnBackendError: true');
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
      /render=\{\s*<Link\s+to=\{`\/dashboard\/items\/\$\{productId\}\/course\/analytics`\}\s*\/>\s*\}/,
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
      /await apiClient\.get\(\s*`\/api\/v1\/items\/\$\{productId\}`\s*,?\s*\)/,
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
      /onClick=\{\(\) => \{\s*if \(lessonDirtyCheckRef\.current\?\.\(\)\) \{\s*setPendingSwitch\(\{\s*lesson,\s*chapterId: chapter\.id,\s*\}\);\s*return;\s*\}\s*switchToLesson\(lesson, chapter\.id\);\s*\}\}/,
    );
    expect(source).toMatch(
      /const switchToLesson = \(nextLesson: Lesson, nextChapterId: number\) => \{\s*setSelectedLesson\(nextLesson\);\s*setSelectedChapterId\(nextChapterId\);\s*setMobileSurface\('editor'\);/,
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
      /<Dropdown\.Item\s+render=\{[\s\S]*?<Link\s+to=\{`\/dashboard\/items\/\$\{productId\}\/course\/analytics`\}[\s\S]*?\}\s*>[\s\S]*?Analytics/,
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
    const settingsFields = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-settings-fields.tsx',
      ),
      'utf8',
    );

    // The cover field itself now lives in the shared settings-fields module;
    // the builder wires it in from there.
    expect(settingsFields).toContain('Cover image');
    expect(source).toContain('<CourseSettingsCoverField');
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
      /(pendingDelete|toDelete)\.type === 'chapter'[\s\S]*?selectedLesson\?\.chapter_id === (pendingDelete|toDelete)\.item\.id/,
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

    expect(source).toContain("import {Skeleton} from '@shadcn/skeleton/skeleton'");
    expect(source).toContain('@shadcn/scroll-area/scroll-area');
    expect(source).toContain('<ScrollArea className="min-h-0 flex-1">');
    expect(source).toContain('<ScrollAreaViewport className="p-3">');
    expect(source).toContain('<ScrollAreaScrollBar onlyShowOnHover />');
    expect(source).toContain('group-data-panel-open:rotate-180');
    expect(source).toContain('Skeleton className="h-5 w-24"');
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

    expect(source).toContain('className="h-5 shrink-0 px-1.5"');
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
      '`/api/v1/items/${course.digital_product_id}/submit`',
    );
    expect(source).toContain("toast.positive('Course submitted for review')");
    expect(source).toContain('const hasPublishedLesson =');
    expect(source).toContain("'Submit for review'");
    expect(source).toContain("'Add a published lesson'");
  });
});

describe('course builder quiz save payload', () => {
  // Regression (prod 422): saveQuiz previously sent `question`, option
  // objects ({text,is_correct}) and a missing/boolean `correct_answer`,
  // while QuizzesController validates `question_text`, `options.*` as
  // strings and a required string `correct_answer`. Lock the mapping.
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('sends question_text, not question', () => {
    expect(source).toContain('question_text: q.question_text');
    expect(source).not.toContain('question: q.question,');
  });

  test('sends options as plain strings', () => {
    expect(source).toContain('options?: string[];');
    expect(source).not.toContain('is_correct');
  });

  test('sends correct_answer as a string', () => {
    expect(source).toContain('correct_answer: q.correct_answer');
  });
});

describe('course builder quiz select labels', () => {
  // Regression: Select.Value fell back to the raw enum (true_false,
  // readable) in the trigger because Base UI derives the display text
  // from measured item DOM text. Both dropdowns now map the value to a
  // human label via the documented Select.Value render prop.
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('question type trigger maps enums to labels', () => {
    expect(source).toContain("(value: string | null) =>");
    expect(source).toContain("value === 'multiple_choice' ? (");
    expect(source).toContain("value === 'true_false' ? (");
  });

  test('lesson type trigger maps enums to labels', () => {
    expect(source).toContain("value === 'video' ? (");
    expect(source).toContain("value === 'readable' ? (");
  });

  test('no bare Select.Value left to fall back to raw values', () => {
    expect(source).not.toContain('<Select.Value />');
  });
});

describe('course builder quiz question cards', () => {
  // Questions render collapsed by default inside the app's own
  // Collapsible, reusing the chapter chevron pattern.
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('each question is a collapsible with the chapter chevron pattern', () => {
    expect(source).toContain('expandedQuestionKeys');
    expect(source).toContain('<CollapsibleContent>');
    expect(source).toContain('group-data-panel-open:rotate-180');
    expect(source).toContain('Untitled question');
  });
});

describe('moved-to-builder notice', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('explains the redirect once, then cleans the param', () => {
    expect(source).toContain('moved-to-builder');
    expect(source).toContain('Course details live here in the course builder.');
    expect(source).toContain('Dismiss');
    expect(source).toContain("next.delete('notice')");
  });
});

describe('submit gating guidance', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('explains blocked and approved states next to the button', () => {
    expect(source).toContain(
      'Publish at least one lesson to submit for review.',
    );
    expect(source).toContain('Edits will return this course to draft.');
    expect(source).toContain("from '@shadcn/tooltip/tooltip'");
    expect(source).toContain('<Tooltip.Root');
    expect(source).toContain('Tooltip.Content');
  });
});
describe('chapter rename feedback', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('saves optimistically with success and revert paths', () => {
    expect(source).toContain('previousTitle');
    expect(source).toContain("toast.positive('Chapter title saved')");
    expect(source).toContain('title: revertedTitle');
    expect(source).toContain("toast.danger(e.message ?? 'Unable to save chapter title')");
  });
});
describe('course settings price', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('uses the ETB input group with a legacy-currency convert guard', () => {
    expect(source).toContain("from '@shadcn/forms/input-group/input-group'");
    expect(source).toContain('<InputGroupText>ETB</InputGroupText>');
    expect(source).toContain('Convert this product price to ETB');
    expect(source).toContain('convertToEtb');
    expect(source).toContain('Enter the correct ETB price and confirm the currency conversion before saving.');
  });
});
describe('course settings description', () => {
  // The description field moved into the shared settings-fields module, which
  // the builder dialog (and the create page) render.
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-settings-fields.tsx',
    ),
    'utf8',
  );
  const builder = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('edits the description in rich text', () => {
    expect(source).toContain('CourseSettingsDescriptionEditor');
    expect(source).toContain('TipTapEditorProvider');
    expect(source).toContain('TiptapEditorContent');
    expect(source).not.toContain('maxLength={20000}');
    expect(builder).toContain('<CourseSettingsDescriptionField');
  });
});
describe('course settings cover', () => {
  const source = fs.readFileSync(
    path.resolve(
      'resources/client/dashboard/courses/course-settings-fields.tsx',
    ),
    'utf8',
  );
  const builder = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('reuses the shared cropped cover uploader', () => {
    expect(source).toContain(
      "import {CroppedCover} from '@common/uploads/components/cropped-image-selector'",
    );
    expect(source).toContain('<CroppedCover');
    expect(source).toContain('uploadType="linkImages"');
    expect(source).toContain('aspect={16 / 9}');
    expect(builder).toContain('<CourseSettingsCoverField');
    expect(source).not.toContain('CoverImageDropzone');
    expect(source).not.toContain('FileDropzone');
    expect(builder).not.toContain('CoverImageDropzone');
    expect(builder).not.toContain('FileDropzone');
  });
});
describe('course settings outcomes dirty tracking', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('outcome edits participate in the discard guard', () => {
    expect(source).toContain('hasOutcomeChanges');
    expect(source).toContain('learning_outcomes ?? []');
    expect(source).toContain('item.text !== savedOutcomes[index]');
  });
});

describe('builder rhythm and loading conventions', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('uses gap rhythm, token radii, and size utilities', () => {
    expect(source).not.toMatch(/space-y-\d/);
    expect(source).not.toContain('rounded-xl');
    expect(source).not.toContain('h-8 w-8');
    expect(source).toContain('rounded-card');
  });

  test('labels icon-only buttons and flags button icons', () => {
    expect(source).toContain('aria-label="Delete chapter"');
    expect(source).toContain('<EyeIcon data-icon="inline-start" />');
    expect(source).toContain('<SettingsIcon data-icon="inline-start" />');
  });

  test('saves show spinner state instead of label swapping', () => {
    expect(source).toContain('<Spinner data-icon="inline-start" />');
    expect(source).not.toContain("message={saving ? 'Saving...' : 'Save changes'}");
    expect(source).not.toContain("message={quizSaving ? 'Saving...' : 'Save quiz'}");
  });

  test('quiz errors use the filled destructive alert', () => {
    expect(source).toContain('fillStyle="subtleFill"');
    expect(source).toContain('<TriangleAlertIcon />');
  });
});

describe('builder copy is translatable', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('wraps bare labels through Trans', () => {
    expect(source).toContain('<Trans message="Analytics" />');
    expect(source).toContain('message="Chapter :id • Lesson editor"');
    expect(source).toContain('<Trans message="or" />');
    expect(source).toContain('message="Current: :name"');
    expect(source).toContain('<Trans message="View" />');
    expect(source).toContain('message="Error loading quiz"');
    expect(source).toContain('message=".mp4, .mov, .mpeg, or .webm"');
  });

  test('uses static messages with interpolation for dynamic titles', () => {
    expect(source).toContain('message="Choose a chapter for :name."');
    expect(source).toContain('message="Delete :name?"');
    expect(source).not.toContain('message={`Choose a chapter');
    expect(source).not.toContain('message={`Delete "');
  });
});

describe('lesson editor preservation and guard', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('type switching preserves both sides for save to decide', () => {
    expect(source).not.toMatch(/setContentType\(next\);\s*if \(next === 'readable'\)/);
  });

  test('video box reflects local editing state', () => {
    expect(source).toContain('Uploaded video attached');
    expect(source).not.toContain('{lesson.video && (');
  });

  test('lesson switching guards unsaved edits', () => {
    expect(source).toContain('pendingSwitch');
    expect(source).toContain('isLessonEditorDirty');
    expect(source).toContain('Discard unsaved changes?');
  });
});

describe('quiz option correctness', () => {
  const source = fs.readFileSync(
    path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
    'utf8',
  );

  test('marks at most one option correct by position, never on empty text', () => {
    expect(source).toContain('firstCorrectIndex');
    expect(source).toContain("findIndex(o => o !== '' && o === q.correct_answer)");
    expect(source).toContain('const isCorrect = oi === firstCorrectIndex;');
    expect(source).not.toContain('const isCorrect = opt === q.correct_answer;');
  });

  test('uses the icon-sm button size without manual overrides', () => {
    expect(source).not.toContain('size="icon"');
  });
});

describe('course builder video embed policy', () => {
  test('warns that YouTube and Vimeo embeds can leave Linket', () => {
    const builderSource = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/course-builder-page.tsx',
      ),
      'utf8',
    );

    expect(builderSource).toContain(
      'YouTube and Vimeo embeds can be opened or shared outside Linket',
    );
  });
});
