import React from 'react';
import Link from '@docusaurus/Link';

const DemoAppCard = ({
  app,
}: {
  app: { title: string; url: string; thumbnail: string; description: string };
}) => (
  <div className="card">
    <div className="card__image">
      <Link to={app.url}>
        <img
          src={app.thumbnail}
          alt={app.title}
          title={app.title}
          style={{ width: 200, margin: '0 auto', display: 'block' }}
        />
      </Link>
    </div>
    <div className="card__body">
      <h2>{app.title}</h2>
      <small>{app.description}</small>
    </div>
    <div className="card__footer">
      <Link className="button button--primary button--block" to={app.url}>
        Check
      </Link>
    </div>
  </div>
);

export default DemoAppCard;
