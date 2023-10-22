import React, { useState, useEffect } from 'react';

export default ({ importPath, title, description, thumbnail, templateItems }: {
  importPath: string;
  title: string;
  description: string;
  thumbnail: string;
  templateItems: {
    id: string;
    jsonUrl: string;
    imgUrl: string;
  }[]
}) => {
  const [DynamicModule, setDynamicModule] = useState<React.FC<any>>();
  useEffect(() => {
    // FIXME このコンポーネント経由で読み込んでいるコンポーネントは、全て
    // Uncaught (in promise) Error: Cannot find module '../../components/DemoApp'
    // となってしまう。
    import(importPath).then((module) => {
      setDynamicModule(() => module.default);
    });
  }, []);

  return <div>
    {DynamicModule ?
      <DynamicModule
        title={title}
        description={description}
        thumbnail={thumbnail}
        templateItems={templateItems} />
      :
      'Loading...'}
  </div>
};
