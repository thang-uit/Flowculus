import type { KnowledgeArticle as Article } from '@/lib/knowledge/types';
import type { ReactNode } from 'react';
import { BpmnNotationTable } from './BpmnNotationTable';
import { CopyFormula } from './CopyFormula';
import { ProcessFigure } from './ProcessFigure';

export function KnowledgeArticle({
  article,
  categoryLabel,
  children,
}: Readonly<{ article: Article; categoryLabel: string; children?: ReactNode }>) {
  return (
    <article
      id={article.id}
      className="knowledge-article"
      tabIndex={-1}
      aria-labelledby={`${article.id}-title`}
    >
      <header className="knowledge-article-heading">
        <h2 id={`${article.id}-title`}>{article.title}</h2>
        <p>{article.summary}</p>
      </header>
      <div className="knowledge-prose">
        {article.blocks.map((block, index) => {
          switch (block.kind) {
            case 'notation':
              return <BpmnNotationTable key={index} />;
            case 'paragraph':
              return <p key={index}>{block.text}</p>;
            case 'heading':
              return <h3 key={index}>{block.text}</h3>;
            case 'formula':
              return <CopyFormula key={index} {...block} />;
            case 'list':
              return (
                <ul key={index}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            case 'notice':
              return (
                <aside key={index} className="knowledge-note">
                  {block.text.split('\n\n').map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </aside>
              );
            case 'example':
              return (
                <section key={index} className="knowledge-example">
                  <h3>{block.title}</h3>
                  <p>{block.text}</p>
                </section>
              );
            case 'diagram':
              return (
                <ProcessFigure
                  key={index}
                  diagram={block.diagram}
                  caption={block.caption}
                />
              );
            case 'table':
              return (
                <div
                  key={index}
                  className="knowledge-table-scroll focus-ring"
                  role="region"
                  aria-label={`${categoryLabel}: ${article.title}`}
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        {block.headers.map((header) => (
                          <th key={header} scope="col">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) =>
                            cellIndex === 0 ? (
                              <th key={cellIndex} scope="row">
                                {cell}
                              </th>
                            ) : (
                              <td key={cellIndex}>{cell}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
          }
        })}
      </div>
      {children}
    </article>
  );
}
