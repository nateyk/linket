import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {generateTimeChartLabel} from '@shadcn/chart/chart-utils';
import preview from '@storybook/preview';
import {TrendingUp} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  PieSectorShapeProps,
  Sector,
  XAxis,
  YAxis,
} from 'recharts';

const meta = preview.meta({
  title: 'Chart',
  component: Chart.Container,
  subcomponents: {
    Legend: Chart.Legend,
    LegendContent: Chart.LegendContent,
    Tooltip: Chart.Tooltip,
    TooltipContent: Chart.TooltipContent,
    LoadingIndicator: Chart.LoadingIndicator,
  },
  tags: ['autodocs'],
});

const chartData = [
  {date: '2024-04-01', desktop: 222, mobile: 150},
  {date: '2024-04-02', desktop: 97, mobile: 180},
  {date: '2024-04-03', desktop: 167, mobile: 120},
  {date: '2024-04-04', desktop: 242, mobile: 260},
  {date: '2024-04-05', desktop: 373, mobile: 290},
  {date: '2024-04-06', desktop: 301, mobile: 340},
  {date: '2024-04-07', desktop: 245, mobile: 180},
  {date: '2024-04-08', desktop: 409, mobile: 320},
  {date: '2024-04-09', desktop: 59, mobile: 110},
  {date: '2024-04-10', desktop: 261, mobile: 190},
  {date: '2024-04-11', desktop: 327, mobile: 350},
  {date: '2024-04-12', desktop: 292, mobile: 210},
  {date: '2024-04-13', desktop: 342, mobile: 380},
  {date: '2024-04-14', desktop: 137, mobile: 220},
  {date: '2024-04-15', desktop: 120, mobile: 170},
  {date: '2024-04-16', desktop: 138, mobile: 190},
  {date: '2024-04-17', desktop: 446, mobile: 360},
  {date: '2024-04-18', desktop: 364, mobile: 410},
  {date: '2024-04-19', desktop: 243, mobile: 180},
  {date: '2024-04-20', desktop: 89, mobile: 150},
  {date: '2024-04-21', desktop: 137, mobile: 200},
  {date: '2024-04-22', desktop: 224, mobile: 170},
  {date: '2024-04-23', desktop: 138, mobile: 230},
  {date: '2024-04-24', desktop: 387, mobile: 290},
  {date: '2024-04-25', desktop: 215, mobile: 250},
  {date: '2024-04-26', desktop: 75, mobile: 130},
  {date: '2024-04-27', desktop: 383, mobile: 420},
  {date: '2024-04-28', desktop: 122, mobile: 180},
  {date: '2024-04-29', desktop: 315, mobile: 240},
  {date: '2024-04-30', desktop: 454, mobile: 380},
  {date: '2024-05-01', desktop: 165, mobile: 220},
  {date: '2024-05-02', desktop: 293, mobile: 310},
  {date: '2024-05-03', desktop: 247, mobile: 190},
  {date: '2024-05-04', desktop: 385, mobile: 420},
  {date: '2024-05-05', desktop: 481, mobile: 390},
  {date: '2024-05-06', desktop: 498, mobile: 520},
  {date: '2024-05-07', desktop: 388, mobile: 300},
  {date: '2024-05-08', desktop: 149, mobile: 210},
  {date: '2024-05-09', desktop: 227, mobile: 180},
  {date: '2024-05-10', desktop: 293, mobile: 330},
];

const barChartData = [
  {browser: 'chrome', visitors: 187, fill: 'var(--chart-1)'},
  {browser: 'safari', visitors: 200, fill: 'var(--chart-2)'},
  {browser: 'firefox', visitors: 275, fill: 'var(--chart-3)'},
  {browser: 'edge', visitors: 173, fill: 'var(--chart-4)'},
  {browser: 'other', visitors: 90, fill: 'var(--chart-5)'},
];

export const BarChartExample = meta.story(() => {
  return (
    <Card size="sm" className="w-full max-w-lg">
      <Card.Header>
        <Card.Title>Bar Chart - Active</Card.Title>
        <Card.Description>January - June 2024</Card.Description>
      </Card.Header>
      <Card.Content>
        <Chart.Container className="aspect-video min-h-[200px]">
          <BarChart accessibilityLayer data={barChartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="browser"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <Chart.Tooltip cursor={false} content={<Chart.TooltipContent />} />
            <Bar dataKey="visitors" radius={8} strokeWidth={2} />
          </BarChart>
        </Chart.Container>
      </Card.Content>
    </Card>
  );
});

export const ChartBarHorizontal = meta.story(() => {
  return (
    <Card size="sm" className="w-full max-w-lg">
      <Card.Header>
        <Card.Title>Bar Chart - Mixed</Card.Title>
        <Card.Description>January - June 2024</Card.Description>
      </Card.Header>
      <Card.Content>
        <Chart.Container className="aspect-video min-h-[200px]">
          <BarChart
            accessibilityLayer
            data={barChartData}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="browser"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <XAxis dataKey="visitors" type="number" hide />
            <Chart.Tooltip cursor={false} content={<Chart.TooltipContent />} />
            <Bar dataKey="visitors" radius={5} />
          </BarChart>
        </Chart.Container>
      </Card.Content>
      <Card.Footer className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </Card.Footer>
    </Card>
  );
});

export const AreaChartExample = meta.story(() => {
  return (
    <Card size="sm" className="w-full pt-0">
      <Card.Header className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <Card.Title>Clicks count</Card.Title>
      </Card.Header>
      <Card.Content>
        <Chart.Container className="aspect-video min-h-[200px]">
          <AreaChart data={chartData}>
            <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
            </linearGradient>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value, index) =>
                generateTimeChartLabel({
                  locale: 'en-US',
                  granularity: 'day',
                  dataItem: chartData[index] as any,
                })
              }
            />
            <Chart.Tooltip content={<Chart.TooltipContent />} />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--chart-2)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--chart-1)"
              stackId="a"
            />
          </AreaChart>
        </Chart.Container>
      </Card.Content>
    </Card>
  );
});

const pieChartData = [
  {browser: 'chrome', visitors: 275, fill: 'var(--chart-1)'},
  {browser: 'safari', visitors: 200, fill: 'var(--chart-2)'},
  {browser: 'firefox', visitors: 187, fill: 'var(--chart-3)'},
  {browser: 'edge', visitors: 173, fill: 'var(--chart-4)'},
  {browser: 'other', visitors: 90, fill: 'var(--chart-5)'},
];

export const PieChartExample = meta.story(() => {
  return (
    <Card className="flex w-full max-w-lg flex-col">
      <Card.Header className="items-center pb-0">
        <Card.Title>Pie Chart - Label List</Card.Title>
        <Card.Description>January - June 2024</Card.Description>
      </Card.Header>
      <Card.Content className="flex-1 pb-0">
        <Chart.Container className="mx-auto aspect-square max-h-[250px] [&_.recharts-text]:fill-background">
          <PieChart>
            <Chart.Tooltip
              content={
                <Chart.TooltipContent itemName={<span>Visitors</span>} />
              }
            />
            <Pie data={pieChartData} dataKey="visitors">
              <LabelList
                dataKey="browser"
                className="fill-background"
                stroke="none"
                fontSize={12}
              />
            </Pie>
          </PieChart>
        </Chart.Container>
      </Card.Content>
      <Card.Footer className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </Card.Footer>
    </Card>
  );
});

const topDevicesPieChartData = [
  {label: 'desktop', value: 275, fill: 'var(--chart-1)'},
  {label: 'mobile', value: 200, fill: 'var(--chart-2)'},
  {label: 'tablet', value: 187, fill: 'var(--chart-3)'},
  {label: 'smart tv', value: 173, fill: 'var(--chart-4)'},
  {label: 'other', value: 90, fill: 'var(--chart-5)'},
];

export const DonutChartExample = meta.story(() => {
  const biggestSectorIndex = topDevicesPieChartData.reduce(
    (biggestIndex, item, index, items) => {
      if (biggestIndex === -1) return index;
      return item.value > items[biggestIndex].value ? index : biggestIndex;
    },
    -1,
  );

  return (
    <Card size="sm" className="w-full max-w-lg">
      <Card.Header>
        <Card.Title>Pie Chart - Top devices</Card.Title>
        <Card.Description>January - June 2024</Card.Description>
      </Card.Header>
      <Card.Content>
        <Chart.Container className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <Chart.Tooltip cursor={false} content={<Chart.TooltipContent />} />
            <Pie
              data={topDevicesPieChartData}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
              shape={({
                index,
                outerRadius = 0,
                ...props
              }: PieSectorShapeProps) =>
                index === biggestSectorIndex ? (
                  <Sector {...props} outerRadius={outerRadius + 10} />
                ) : (
                  <Sector {...props} outerRadius={outerRadius} />
                )
              }
            >
              <LabelList
                dataKey="label"
                className="fill-background"
                stroke="none"
                fontSize={12}
              />
            </Pie>
          </PieChart>
        </Chart.Container>
      </Card.Content>
    </Card>
  );
});
