import React from 'react';
import Link from '@docusaurus/Link';

const DemoAppCard = ({
  app,
}: {
  app: {
    title: string;
    tags: ('ui/form' | 'ui/viewer' | 'ui/designer' | 'generator')[];
    url: string;
    thumbnail: string;
    description: string;
  };
}) => (
  <div className="card shadow--md">
    <div className="card__image">
      <Link to={app.url}>
        <img
          src={app.thumbnail}
          alt={app.title}
          title={app.title}
          style={{ margin: '0 auto', padding: '1rem', display: 'block' }}
          width={348}
          height={348}
        />
      </Link>
    </div>
    <div className="card__body">
      <h2 className="margin-bottom--xs">{app.title}</h2>
      <div className="margin-bottom--xs">
        <small> made of: </small>
        {app.tags.map((tag) => {
          let link = '';
          let color = '';
          if (tag === 'ui/form') {
            link = '/docs/getting-started#form';
            color = 'badge badge--info';
          } else if (tag === 'ui/viewer') {
            link = '/docs/getting-started#viewer';
            color = 'badge--warning';
          } else if (tag === 'ui/designer') {
            link = '/docs/getting-started#designer';
            color = 'badge--success';
          } else if (tag === 'generator') {
            link = '/docs/getting-started#generator';
            color = 'badge--danger';
          }
          return (
            <Link key={tag} to={link}>
              <span className={`badge ${color} margin-right--xs`}>{tag}</span>
            </Link>
          );
        })}
      </div>
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
