
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, IncidentReport } from '../types';
import { formatDisplayDate } from '../utils/time';

// --- Sub-components for better organization ---

// Status Badge Component
const StatusBadge: React.FC<{ status: IncidentReport['status'] }> = ({ status }) => {
    const statusStyles = {
        submitted: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-blue-100 text-blue-800',
        resolved: 'bg-green-100 text-green-800',
    };
    const statusText = {
        submitted: 'Submitted',
        in_progress: 'In Progress',
        resolved: 'Resolved',
    };
    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusStyles[status]}`}>
            {statusText[status]}
        </span>
    );
};

// Incident Report Card Component
const ReportCard: React.FC<{ report: IncidentReport }> = ({ report }) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-border-color hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <h3 className="font-bold text-text-primary pr-2 break-words">{report.subject}</h3>
            <StatusBadge status={report.status} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
            Filed on: {formatDisplayDate(report.created_at)}
        </p>
        <p className="text-sm text-text-primary mt-3 whitespace-pre-wrap break-words">
            {report.body}
        </p>
        {report.image_url && (
            <div className="mt-4">
                <a href={report.image_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                    View Attached Image
                </a>
            </div>
        )}
    </div>
);


// Incident Report Form Component
const ReportForm: React.FC<{
    user: User;
    onCancel: () => void;
    onSubmitSuccess: () => void;
}> = ({ user, onCancel, onSubmitSuccess }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Basic validation
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size cannot exceed 5MB.');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                setError('Only JPG, PNG, and GIF files are allowed.');
                return;
            }

            setError(null);
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim()) {
            setError('Subject and body are required.');
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            let imageUrl: string | null = null;
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${user.userid}-${Date.now()}.${fileExt}`;
                const filePath = `${user.userid}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('incident-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    throw new Error(`Image upload failed: ${uploadError.message}`);
                }
                
                const { data } = supabase.storage
                    .from('incident-images')
                    .getPublicUrl(filePath);
                
                imageUrl = data.publicUrl;
            }

            const { error: insertError } = await supabase.from('incident_reports').insert({
                user_id: user.userid,
                user_name: user.name,
                subject: subject.trim(),
                body: body.trim(),
                image_url: imageUrl,
                status: 'submitted',
            });

            if (insertError) throw insertError;

            onSubmitSuccess();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to submit report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-scale">
            <div>
                <label htmlFor="subject" className="block text-sm font-medium text-text-secondary mb-1">
                    Subject
                </label>
                <input
                    id="subject"
                    type="text"
                    required
                    maxLength={100}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-border-color rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
            </div>
            <div>
                <label htmlFor="body" className="block text-sm font-medium text-text-secondary mb-1">
                    Details of Incident
                </label>
                <textarea
                    id="body"
                    required
                    rows={5}
                    maxLength={1000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-border-color rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
            </div>
            <div>
                <label htmlFor="image" className="block text-sm font-medium text-text-secondary mb-1">
                    Attach an Image (Optional)
                </label>
                <input
                    id="image"
                    type="file"
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleFileChange}
                    className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-icon-bg file:text-primary hover:file:bg-primary/20"
                />
                {imagePreview && (
                    <div className="mt-4">
                        <img src={imagePreview} alt="Image preview" className="max-h-40 rounded-lg border border-border-color" />
                    </div>
                )}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div className="flex flex-col sm:flex-row-reverse justify-start gap-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto flex justify-center py-3 px-6 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Submit Report'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="w-full sm:w-auto flex justify-center py-3 px-6 border border-border-color rounded-md shadow-sm text-sm font-bold text-text-secondary bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};


// Main Component
interface IncidentReportsProps {
    user: User;
    initialReports: IncidentReport[];
    onUpdate: () => void;
}

const IncidentReports: React.FC<IncidentReportsProps> = ({ user, initialReports, onUpdate }) => {
    const [view, setView] = useState<'list' | 'form'>('list');

    const handleFormSubmitSuccess = () => {
        onUpdate(); // Re-fetch all data, including new report
        setView('list'); // Switch back to list view
    };

    return (
        <div>
            {view === 'list' ? (
                <div className="animate-fade-in-scale">
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setView('form')}
                            className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm transition transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span>File New Report</span>
                        </button>
                    </div>
                    {initialReports.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {initialReports.map(report => <ReportCard key={report.id} report={report} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-border-color rounded-lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="mt-4 text-text-secondary">You have not filed any incident reports.</p>
                        </div>
                    )}
                </div>
            ) : (
                <ReportForm user={user} onCancel={() => setView('list')} onSubmitSuccess={handleFormSubmitSuccess} />
            )}
        </div>
    );
};

export default IncidentReports;