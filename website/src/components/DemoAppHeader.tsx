import React from 'react';

export default function DemoAppHeader(props: {
  title: string;
  description: string;
  thumbnail: string;
}): JSX.Element {
  const { title, description, thumbnail } = props;
  return (
    <header className={'hero hero--primary'}>
      <div className="container">
        <div className="row" style={{ alignItems: 'center', flexDirection: 'row-reverse' }}>
          <div className="col col--6" style={{ textAlign: 'center' }}>
            <img src={thumbnail} alt={title} width={400} />
          </div>
          <div className="col col--6">
            <h1 className="hero__title">{title}</h1>
            <p className="hero__subtitle" style={{ whiteSpace: 'pre-line' }}>
              {description}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
