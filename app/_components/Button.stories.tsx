import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { Save, Plus, Trash2, Edit, LogOut, Copy } from "lucide-react";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    priority: {
      control: "select",
      options: ["primary", "secondary"],
      description: "버튼의 우선순위",
    },
    variant: {
      control: "select",
      options: ["filled", "outlined", "text"],
      description: "버튼의 스타일",
    },
    disabled: {
      control: "boolean",
      description: "비활성화 상태",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Primary Filled
export const PrimaryFilled: Story = {
  args: {
    children: "Primary Filled",
    priority: "primary",
    variant: "filled",
  },
};

export const PrimaryFilledWithIcon: Story = {
  args: {
    children: "저장",
    priority: "primary",
    variant: "filled",
    icon: Save,
  },
};

// Primary Outlined
export const PrimaryOutlined: Story = {
  args: {
    children: "Primary Outlined",
    priority: "primary",
    variant: "outlined",
  },
};

export const PrimaryOutlinedWithIcon: Story = {
  args: {
    children: "추가",
    priority: "primary",
    variant: "outlined",
    icon: Plus,
  },
};

// Primary Text
export const PrimaryText: Story = {
  args: {
    children: "Primary Text",
    priority: "primary",
    variant: "text",
  },
};

export const PrimaryTextWithIcon: Story = {
  args: {
    children: "수정",
    priority: "primary",
    variant: "text",
    icon: Edit,
  },
};

// Secondary Filled
export const SecondaryFilled: Story = {
  args: {
    children: "Secondary Filled",
    priority: "secondary",
    variant: "filled",
  },
};

export const SecondaryFilledWithIcon: Story = {
  args: {
    children: "취소",
    priority: "secondary",
    variant: "filled",
    icon: Copy,
  },
};

// Secondary Outlined
export const SecondaryOutlined: Story = {
  args: {
    children: "Secondary Outlined",
    priority: "secondary",
    variant: "outlined",
  },
};

export const SecondaryOutlinedWithIcon: Story = {
  args: {
    children: "로그아웃",
    priority: "secondary",
    variant: "outlined",
    icon: LogOut,
  },
};

// Secondary Text
export const SecondaryText: Story = {
  args: {
    children: "Secondary Text",
    priority: "secondary",
    variant: "text",
  },
};

export const SecondaryTextWithIcon: Story = {
  args: {
    children: "삭제",
    priority: "secondary",
    variant: "text",
    icon: Trash2,
  },
};

// Disabled States
export const PrimaryDisabled: Story = {
  args: {
    children: "Disabled Primary",
    priority: "primary",
    variant: "filled",
    disabled: true,
  },
};

export const SecondaryDisabled: Story = {
  args: {
    children: "Disabled Secondary",
    priority: "secondary",
    variant: "outlined",
    disabled: true,
  },
};

// All Variants Comparison
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Primary</h3>
        <div className="flex gap-4">
          <Button priority="primary" variant="filled">
            Filled
          </Button>
          <Button priority="primary" variant="outlined">
            Outlined
          </Button>
          <Button priority="primary" variant="text">
            Text
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Secondary</h3>
        <div className="flex gap-4">
          <Button priority="secondary" variant="filled">
            Filled
          </Button>
          <Button priority="secondary" variant="outlined">
            Outlined
          </Button>
          <Button priority="secondary" variant="text">
            Text
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">With Icons</h3>
        <div className="flex gap-4">
          <Button priority="primary" variant="filled" icon={Save}>
            저장
          </Button>
          <Button priority="primary" variant="outlined" icon={Plus}>
            추가
          </Button>
          <Button priority="secondary" variant="filled" icon={Copy}>
            복사
          </Button>
          <Button priority="secondary" variant="text" icon={Trash2}>
            삭제
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Disabled</h3>
        <div className="flex gap-4">
          <Button priority="primary" variant="filled" disabled>
            Disabled
          </Button>
          <Button priority="primary" variant="outlined" disabled>
            Disabled
          </Button>
          <Button priority="secondary" variant="filled" disabled>
            Disabled
          </Button>
        </div>
      </div>
    </div>
  ),
};
