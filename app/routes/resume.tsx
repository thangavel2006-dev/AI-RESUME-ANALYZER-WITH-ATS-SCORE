import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
const emptyCategory = () => ({
    score: 0,
    tips: [],
});

const emptyFeedback = (): Feedback => ({
    overallScore: 0,
    ATS: { score: 0, tips: [] },
    toneAndStyle: emptyCategory(),
    content: emptyCategory(),
    structure: emptyCategory(),
    skills: emptyCategory(),
});
const normalizeFeedback = (raw: any): Feedback => {
    if (!raw || typeof raw !== "object") {
        return emptyFeedback();
    }

    // If already normalized (future-proof)
    if (raw.overallScore && raw.ATS) {
        return raw as Feedback;
    }

    const to100 = (v?: number) =>
        typeof v === "number" ? Math.round(v * 10) : 0;

    /* ---------- Tips ---------- */
    const strengthTips = (raw.strengths ?? []).map((s: string) => ({
        type: "good" as const,
        tip: s,
        explanation: s,
    }));

    const weaknessTips = (raw.weaknesses ?? []).map((w: string) => ({
        type: "improve" as const,
        tip: w,
        explanation: w,
    }));

    const atsTips = (raw.ats_optimization ?? []).map((a: string) => ({
        type: "improve" as const,
        tip: a,
        explanation: a,
    }));
    const overallScore = to100(raw.overall_rating);

    const atsScore =
        atsTips.length > 0
            ? Math.min(100, 50 + atsTips.length * 5)
            : Math.max(40, overallScore - 10);

    const toneScore = to100(
        raw.job_match_analysis?.communication_score ?? raw.overall_rating
    );

    const skillsScore = to100(
        raw.job_match_analysis?.skill_match_score ?? raw.overall_rating
    );

    const contentScore = Math.max(
        30,
        100 - weaknessTips.length * 8
    );

    return {
        overallScore,

        ATS: {
            score: atsScore,
            tips: atsTips,
        },

        toneAndStyle: {
            score: toneScore,
            tips: strengthTips,
        },

        content: {
            score: contentScore,
            tips: weaknessTips,
        },

        structure: {
            score: overallScore,
            tips: [],
        },

        skills: {
            score: skillsScore,
            tips: strengthTips,
        },
    };
};

export const meta = () => ([
    { title: "Resumind | Review" },
    { name: "description", content: "Detailed overview of your resume" },
]);

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const navigate = useNavigate();

    const [imageUrl, setImageUrl] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [feedback, setFeedback] = useState<Feedback | null>(null);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, navigate, id]);
    useEffect(() => {
        const loadResume = async () => {
            const raw = await kv.get(`resume:${id}`);
            if (!raw) return;

            const data = JSON.parse(raw);

            // PDF
            const pdf = await fs.read(data.resumePath);
            if (pdf) {
                setResumeUrl(
                    URL.createObjectURL(
                        new Blob([pdf], { type: "application/pdf" })
                    )
                );
            }

            // Image
            const img = await fs.read(data.imagePath);
            if (img) {
                setImageUrl(URL.createObjectURL(img));
            }

            // Feedback
            const normalized = normalizeFeedback(data.feedback);
            setFeedback(normalized);

            console.log("RAW FEEDBACK:", data.feedback);
            console.log("NORMALIZED FEEDBACK:", normalized);
        };

        loadResume();
    }, [id, fs, kv]);

    const atsScore = feedback?.ATS.score ?? 0;
    const atsTips = feedback?.ATS.tips ?? [];

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" className="w-2.5 h-2.5" />
                    <span className="text-sm font-semibold">
                        Back to Homepage
                    </span>
                </Link>
            </nav>

            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                {/* Resume Preview */}
                <section className="feedback-section sticky top-0 h-[100vh]">
                    {imageUrl && resumeUrl && (
                        <a href={resumeUrl} target="_blank" rel="noreferrer">
                            <img
                                src={imageUrl}
                                className="rounded-2xl"
                                alt="Resume preview"
                            />
                        </a>
                    )}
                </section>

                {/* Feedback */}
                <section className="feedback-section">
                    <h2 className="text-4xl font-bold">Resume Review</h2>

                    {feedback ? (
                        <>
                            <Summary feedback={feedback} />
                            <ATS score={atsScore} suggestions={atsTips} />
                            <Details feedback={feedback} />
                        </>
                    ) : (
                        <img
                            src="/images/resume-scan-2.gif"
                            alt="Loading"
                        />
                    )}
                </section>
            </div>
        </main>
    );
};

export default Resume;
