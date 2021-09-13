import { ComponentStory, ComponentMeta } from '@storybook/react';
import { Simple as _Simple } from './Simple';

export default {
  title: 'Sample',
  component: _Simple,
} as ComponentMeta<typeof _Simple>;

const SimpleTemplate: ComponentStory<typeof _Simple> = () => <_Simple />;

export const Simple = SimpleTemplate.bind({});
