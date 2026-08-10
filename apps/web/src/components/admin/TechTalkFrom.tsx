'use client';

import { useState } from 'react';

export function TechTalkForm(): React.JSX.Element {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [presenters, setPresenters] = useState<string[]>([]);

    const addPresenter = (presenter: string) => {
        if (!presenters.includes(presenter)) {
            setPresenters([...presenters, presenter]);
        }
    };

    const removePresenter = (presenterToRemove: string) => {
        setPresenters(
            presenters.filter((presenter) => presenter !== presenterToRemove)
        );
    };

    return (
        <form>
            <div>
                <label htmlFor="title">Title</label>

                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label htmlFor="description">Description</label>

                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div>
                <label htmlFor="presenters">Presenters</label>

                <div>
                    {presenters.map((presenter) => (
                        <span key={presenter}>
                            {presenter}

                            <button
                                type="button"
                                onClick={() => removePresenter(presenter)}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>

                <input
                    id="presenters"
                    type="text"
                    placeholder="Add presenter..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                            e.preventDefault();

                            addPresenter(e.currentTarget.value.trim());

                            e.currentTarget.value = '';
                        }
                    }}
                />
            </div>
        </form>


    );
}