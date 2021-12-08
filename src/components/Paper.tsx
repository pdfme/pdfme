import { ReactNode } from 'react';
import { zoom } from '../libs/constants';
import { TemplateSchema, PageSize } from '../libs/type';

const Paper = ({
  scale,
  schemas,
  pageSizes,
  backgrounds,
  render,
}: {
  scale: number;
  schemas: {
    [key: string]: TemplateSchema;
  }[];
  pageSizes: PageSize[];
  backgrounds: string[];
  render: ({
    index,
    schema,
    paperSize,
    background,
  }: {
    index: number;
    schema: {
      [key: string]: TemplateSchema;
    };
    paperSize: PageSize;
    background: string;
  }) => ReactNode;
}) => (
  <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
    {schemas.map((schema, index) => {
      const pageSize = pageSizes[index];
      if (!pageSize) {
        return null;
      }
      const paperSize = { width: pageSize.width * zoom, height: pageSize.height * zoom };
      const background = backgrounds[index];
      return (
        <div
          key={JSON.stringify(schema)}
          style={{ margin: `0 auto`, position: 'relative', background: '#333', ...paperSize }}
        >
          {render({ index, schema, paperSize, background })}
        </div>
      );
    })}
  </div>
);

export default Paper;
