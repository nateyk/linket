import {Button} from '@shadcn/button/button';
import {useSettings} from '@ui/settings/use-settings';

export function DemoLoginPanel() {
  const {base_url} = useSettings();
  return (
    <div className="fixed top-0 left-0 m-4 flex w-110 max-w-full flex-col gap-0.5 rounded-card border bg-card p-4 shadow-md">
      <div className="font-medium">Demo mode</div>
      <div className="text-sm text-muted-foreground">
        Use demo one-click login buttons to login with a premade account or
        create a new account and login manually.
      </div>
      <form action={`${base_url}/demo-login`} method="POST">
        <div className="mt-3 flex gap-2">
          <Button
            color="primary"
            variant="outline"
            size="sm"
            type="submit"
            name="type"
            value="admin"
          >
            Login as admin
          </Button>
          <Button
            color="primary"
            variant="outline"
            size="sm"
            type="submit"
            name="type"
            value="user"
          >
            Login as user
          </Button>
        </div>
      </form>
    </div>
  );
}
